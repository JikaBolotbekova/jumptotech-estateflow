import { useEffect, useState, useCallback } from 'react';
import { fetchProperties, createProperty, deleteProperty, type Property, type NewProperty } from './api';
import { PropertyList } from './components/PropertyList';
import { PropertyForm } from './components/PropertyForm';

export function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchProperties();
      setProperties(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(property: NewProperty) {
    await createProperty(property);
    await load();
  }

  async function handleDelete(id: number) {
    await deleteProperty(id);
    await load();
  }

  return (
    <main>
      <h1>EstateFlow</h1>
      {error && <p role="alert">{error}</p>}
      <PropertyForm onCreate={handleCreate} />
      <PropertyList properties={properties} onDelete={handleDelete} />
    </main>
  );
}
