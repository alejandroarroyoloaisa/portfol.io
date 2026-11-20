// Base de datos y carpeta de ficheros exclusivas para las pruebas
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://portfolio:portfolio@localhost:5434/portfolio_test?schema=public';
process.env.UPLOAD_DIR = './uploads-test';
process.env.PUBLIC_URL = 'http://test.local';
process.env.NODE_ENV = 'test';
