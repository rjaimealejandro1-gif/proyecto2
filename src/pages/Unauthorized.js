import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <h2>Acceso Denegado</h2>
        <p>No tienes los permisos necesarios para acceder a esta página.</p>
        <Link to="/login" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
