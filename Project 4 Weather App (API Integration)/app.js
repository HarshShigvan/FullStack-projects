const apiKey = '2d9555d69emsh45c1158a6655e4bp11b5ddjsna514ef5d96fd';
const baseUrl = 'https://weather-api167.p.rapidapi.com/api/weather/forecast';

const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': apiKey,
		'x-rapidapi-host': 'weather-api167.p.rapidapi.com',
		Accept: 'application/json'
	}
};

async function fetchForecast(place) {
	const url = `${baseUrl}?place=${encodeURIComponent(place)}&cnt=3&units=standard&type=three_hour&mode=json&lang=en`;
	try {
		const response = await fetch(url, options);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error fetching forecast data:', error);
		return null;
	}
}

function displayForecast(data, elementId) {
	const element = document.getElementById(elementId);
	if (data && data.list && data.list.length > 0) {
		element.innerHTML = `
			<h6>${data.city.name}, ${data.city.country}</h6>
			${data.list.map(item => `
				<div>
					<p><strong>${new Date(item.dt * 1000).toLocaleString()}</strong></p>
					<p>Temperature: ${item.main.temp}°C</p>
					<p>Humidity: ${item.main.humidity}%</p>
					<p>Wind Speed: ${item.wind.speed} m/s</p>
					<p>Description: ${item.weather[0].description}</p>
				</div>
			`).join('')}
		`;
	} else {
		element.innerHTML = '<p>Unable to fetch forecast data. Please try again.</p>';
	}
}

function displayCitiesForecast(cities) {
	const tbody = document.getElementById('cities-weather');
	tbody.innerHTML = '';
	cities.forEach(async (city) => {
		const data = await fetchForecast(city);
		if (data && data.list && data.list.length > 0) {
			const current = data.list[0];
			const row = `
				<tr>
					<td>${data.city.name}</td>
					<td>${current.main.temp}°C</td>
					<td>${current.main.humidity}%</td>
					<td>${current.wind.speed} m/s</td>
				</tr>
			`;
			tbody.innerHTML += row;
		}
	});
}

document.addEventListener('DOMContentLoaded', async () => {
	// Load default forecast for London
	const defaultData = await fetchForecast('London,GB');
	displayForecast(defaultData, 'weather-info');

	// Load forecast for predefined cities
	const cities = ['Mumbai,IN', 'Chiplun,IN', 'Ratnagiri,IN'];
	displayCitiesForecast(cities);

	// Handle search form
	const searchForm = document.querySelector('form[role="search"]');
	searchForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const searchInput = searchForm.querySelector('input[type="search"]');
		const query = searchInput.value.trim();
		if (query) {
			const data = await fetchForecast(query);
			displayForecast(data, 'weather-info');
		}
	});
});
