const Joi = require('joi');

/**
 * validate — Joi middleware factory.
 * @param {Joi.Schema} schema
 * @param {'body'|'query'|'params'} target
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly:    false,
      stripUnknown:  true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  error.details.map((d) => d.message),
      });
    }
    req[target] = value;
    next();
  };
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const bloodGroupSchema = Joi.string()
  .valid(...BLOOD_GROUPS)
  .messages({ 'any.only': `Blood group must be one of: ${BLOOD_GROUPS.join(', ')}` });

const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { validate, bloodGroupSchema, paginationSchema, BLOOD_GROUPS };
