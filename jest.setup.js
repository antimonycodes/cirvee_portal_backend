const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.test') });

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

// console.log('--- Jest Setup ---');
// console.log('PWD:', process.cwd());
// console.log('NODE_ENV:', process.env.NODE_ENV);
// console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
// if (process.env.DATABASE_URL) {
//   console.log('DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password
// }

//  test timeout globally
jest.setTimeout(30000);