const serializeUser = (user) => {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  // Also map snake_case to camelCase since the SQL uses snake_case, but the front-end might expect camelCase
  // Actually, let's just return rest. The user's code expects some fields.
  return rest;
};

module.exports = { serializeUser };
