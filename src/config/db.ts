import { neon } from '@neondatabase/serverless';

const NEON_CONNECTION_STRING = "postgresql://neondb_owner:npg_qh1SPGYLeDZ7@ep-holy-waterfall-ao3mavlp-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Initialize the official Neon HTTP query connection engine
const sql = neon(NEON_CONNECTION_STRING);

export const db = {
  async query(queryString: string, params: any[] = []) {
    try {
      console.log(`[Neon DB Execution]: ${queryString}`);
      
      // Execute manually parameterized transactions safely using the official driver
      const result = await sql.query(queryString, params);
      return result;
    } catch (error) {
      console.error("Database Error:", error);
      return []; // Return an empty array structural fallback to prevent mobile layout crashes
    }
  }
};