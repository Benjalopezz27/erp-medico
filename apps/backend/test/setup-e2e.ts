process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ARCA_ENV = process.env.ARCA_ENV || 'development';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  'test_ci_jwt_secret_key_minimum_32_characters_long!';
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
process.env.SEED_ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD || 'TestAdminPassword123!';
process.env.SEED_VENDEDOR_PASSWORD =
  process.env.SEED_VENDEDOR_PASSWORD || 'TestVendedorPassword123!';
process.env.THROTTLE_LIMIT_GLOBAL = '10000';
process.env.THROTTLE_LIMIT_LOGIN = '10000';
