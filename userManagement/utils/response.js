export const ok = (res, payload = {}, meta = {}) => {
  return res.json({ success: true, ...payload, ...meta });
};

export const created = (res, payload = {}, meta = {}) => {
  return res.status(201).json({ success: true, ...payload, ...meta });
};

export const badRequest = (res, message = 'Bad request', errors) => {
  return res.status(400).json({ success: false, message, errors });
};

export const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, message });
};

export const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ success: false, message });
};

export const notFound = (res, message = 'Not found') => {
  return res.status(404).json({ success: false, message });
};

export const serverError = (res, message = 'Internal server error') => {
  return res.status(500).json({ success: false, message });
};


