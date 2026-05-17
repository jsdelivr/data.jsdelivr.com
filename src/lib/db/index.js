import knex from 'knex';
import knexfile from '../../../knexfile.js';

export default knex(knexfile[process.env.NODE_ENV] || knexfile.development);
