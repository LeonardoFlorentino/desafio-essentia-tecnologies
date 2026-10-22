// Every commit message must follow Conventional Commits (type(scope): subject).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // This repository uses one-line commits: the subject says it all.
    'body-empty': [2, 'always'],
    'footer-empty': [2, 'always'],
  },
};
