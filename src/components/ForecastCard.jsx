export default function ForecastCard({ data, unit }) {
  const date = new Date(data.dt * 1000).toLocaleDateString();
  return (
    <div className="bg-white dark:bg-gray-800 rounded p-2 shadow text-center">
      <p className="font-semibold">{date}</p>
      <p>{Math.round(data.main.temp)}°{unit === 'metric' ? 'C' : 'F'}</p>
    </div>
  );
}