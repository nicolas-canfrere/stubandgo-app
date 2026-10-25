import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2">
        <Link to="/" className="text-indigo-700 hover:underline">
          Retour à l'accueil
        </Link>
      </p>
    </section>
  );
}
