process.on('exit',(c)=>console.log('EXIT code:',c));
process.on('uncaughtException',(e)=>console.error('UNCAUGHT:',e.message,e.stack));
process.on('unhandledRejection',(r)=>console.error('UNHANDLED:',r));
require('/var/www/cfa/backend/server.js');
