// Auto-generado por DEVELOPER agent
const { z } = require('zod');

const createFeedbackSchema = z.object({
    userId: z.string(),
    message: z.string()
});

module.exports = function registerCreateFeedback(app, prisma) {
  app.post('/api/feedback', async (req, res, next) => {
    try {
    const input = createFeedbackSchema.parse(req.body);
    const created = await prisma.feedback.create({ data: input });
    res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });
};
