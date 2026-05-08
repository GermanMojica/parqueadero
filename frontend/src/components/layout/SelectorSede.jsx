import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sedesApi } from '../../api/index';
import s from './SelectorSede.module.css';
import { Building2 } from 'lucide-react';

export default function SelectorSede() {
  const { usuario, isAdmin, sedeActual, setSedeActual } = useAuth();
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no es admin y no tiene rol que permita multiples sedes libremente, 
    // en un sistema real el endpoint /sedes devolvería solo las que tiene acceso.
    // Asumimos que el backend retorna las accesibles.
    sedesApi.getAll()
      .then(data => {
        setSedes(data || []);
        if (data && data.length > 0 && !sedeActual) {
          // Si hay sedes y no hay una seleccionada, usar la del usuario por defecto o la primera
          const defaultSede = data.find(s => s.id === usuario?.sede_id) || data[0];
          setSedeActual(defaultSede.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || sedes.length <= 1) return null; // No mostrar si hay 1 sola sede o carga

  return (
    <div className={s.selectorWrapper}>
      <Building2 size={16} className={s.icon} />
      <select 
        value={sedeActual || ''} 
        onChange={(e) => setSedeActual(Number(e.target.value))}
        className={s.select}
      >
        {sedes.map(sede => (
          <option key={sede.id} value={sede.id}>{sede.nombre}</option>
        ))}
      </select>
    </div>
  );
}
