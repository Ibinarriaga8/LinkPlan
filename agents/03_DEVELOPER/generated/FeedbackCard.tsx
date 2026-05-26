// Auto-generado por DEVELOPER agent
type FeedbackCardProps = {
  title: string;
  rating: number;
};

export default function FeedbackCard({ title, rating }: FeedbackCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h2 className="text-lg font-semibold">FeedbackCard</h2>
      <p className="text-sm text-slate-600">title: {String(title)}</p>
      <p className="text-sm text-slate-600">rating: {String(rating)}</p>
    </section>
  );
}
