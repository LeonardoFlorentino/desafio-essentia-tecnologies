import { fadeOut, measure, play } from './list-motion';

// jsdom has no Web Animations API and no layout: `animate` records what was asked, and each row
// says where it is. The real motion is seen in the browser (E2E and the visual check).

describe('list motion', () => {
  let list: HTMLElement;
  let animations: { id: string; keyframes: Keyframe[]; options: KeyframeAnimationOptions }[];
  const top = new Map<string, number>();
  /** Animations still attached to each row (what getAnimations returns). */
  const attached = new Map<string, Animation[]>();

  function row(id: string, y: number) {
    const li = document.createElement('li');
    li.dataset['taskId'] = id;
    top.set(id, y);
    li.getBoundingClientRect = () => ({ left: 0, top: top.get(id)! }) as DOMRect;
    li.animate = (keyframes, options) => {
      animations.push({
        id,
        keyframes: keyframes as Keyframe[],
        options: options as KeyframeAnimationOptions,
      });
      return { finished: Promise.resolve() } as unknown as Animation;
    };
    li.getAnimations = () => attached.get(id) ?? [];
    list.append(li);
    return li;
  }

  beforeEach(() => {
    animations = [];
    list = document.createElement('ul');
    list.animate = () => ({}) as Animation; // marks the browser as able to animate
    // The tokens, as styles.scss defines them.
    list.style.setProperty('--duration-fast', '120ms');
    list.style.setProperty('--duration-base', '200ms');
    list.style.setProperty('--ease-out', 'cubic-bezier(0.2, 0.8, 0.2, 1)');
    list.style.setProperty('--ease-in-out', 'cubic-bezier(0.77, 0, 0.175, 1)');
    document.body.append(list);
  });

  afterEach(() => {
    list.remove();
    attached.clear();
  });

  /** An animation as the browser keeps it attached, with a spy on cancel. */
  function attachedAnimation(id: string, fill: FillMode) {
    const animation = {
      effect: { getTiming: () => ({ fill }) },
      cancel: vi.fn(),
    } as unknown as Animation;
    attached.set(id, [...(attached.get(id) ?? []), animation]);
    return animation;
  }

  it('lets go of the exit fade of a row that stayed, so it does not remain invisible', () => {
    // A strip group clicked twice quickly: the row started to fade out, then the newer list kept it.
    row('1', 0);
    const fade = attachedAnimation('1', 'forwards');
    const slide = attachedAnimation('1', 'auto');

    play(list, new Map(), false);

    expect(fade.cancel).toHaveBeenCalled();
    expect(slide.cancel).not.toHaveBeenCalled();
  });

  it('slides a row that moved from its old place, and fades a new row in', () => {
    row('1', 0);
    const before = measure(list);
    top.set('1', 80); // a new row now sits above it
    row('2', 0);

    play(list, before, false);

    expect(animations).toEqual([
      {
        id: '1',
        keyframes: [{ transform: 'translate(0px, -80px)' }, { transform: 'none' }],
        options: { duration: 200, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' },
      },
      {
        id: '2',
        keyframes: [
          { opacity: 0, transform: 'translateY(-4px)' },
          { opacity: 1, transform: 'none' },
        ],
        options: { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      },
    ]);
  });

  it('with reduced motion, nothing moves: new rows only fade in', () => {
    row('1', 0);
    const before = measure(list);
    top.set('1', 80);
    row('2', 0);

    play(list, before, true);

    expect(animations.map((a) => [a.id, a.keyframes[0]])).toEqual([['2', { opacity: 0 }]]);
  });

  it('leaves rows that did not move alone, and animates nothing on the first list', () => {
    row('1', 0);
    play(list, measure(list), false);
    play(list, new Map(), false);
    expect(animations).toEqual([]);
  });

  it('fades out only the rows that leave, and waits for them', async () => {
    row('1', 0);
    row('2', 40);

    const fading = fadeOut(list, new Set(['1']));

    expect(animations.map((a) => [a.id, a.options.duration, a.options.fill])).toEqual([
      ['2', 120, 'forwards'],
    ]);
    await expect(fading).resolves.toBeUndefined();
  });

  it('goes on at once when nothing leaves, or when the browser cannot animate', () => {
    row('1', 0);
    expect(fadeOut(list, new Set(['1']))).toBeUndefined();

    const plain = document.createElement('ul');
    expect(fadeOut(plain, new Set())).toBeUndefined();
    expect(measure(plain).size).toBe(0);
    expect(fadeOut(undefined, new Set())).toBeUndefined();
  });
});
