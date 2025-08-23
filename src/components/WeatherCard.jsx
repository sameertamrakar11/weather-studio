export default function WeatherCard({ data, unit }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded p-4 shadow">
      <h2 className="text-xl font-bold">{data.name}</h2>
      <p className="text-lg">{data.weather[0].description}</p>
      <p className="text-2xl">{Math.round(data.main.temp)}°{unit === 'metric' ? 'C' : 'F'}</p>
    </div>
  );
}