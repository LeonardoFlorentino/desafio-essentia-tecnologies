import mysql from 'mysql2/promise';
import { config } from '../config';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  // DATE columns (due dates) are calendar days: keep them as 'YYYY-MM-DD' text. As JS Dates they
  // would become midnight in the server's time zone and could shift a day once sent as JSON.
  dateStrings: ['DATE'],
});
