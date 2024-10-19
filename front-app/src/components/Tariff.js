import React, { useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2'; // Import Line chart from Chart.js
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';


// Register the necessary components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const TariffForm = () => {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [kWh, setKWh] = useState(1000); // Default to minimum 1000 kWh
  const [escalator, setEscalator] = useState(4); // Default to minimum 4%
  const [apiResponse, setApiResponse] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [selectedTariff, setSelectedTariff] = useState('');
  const [cost, setCost] = useState(null);
  const [error, setError] = useState('');
  const [mostLikelyTariff, setMostLikelyTariff] = useState(null); // State for most likely tariff
  const [graphData, setGraphData] = useState(null); // State for graph data

  // Fetch address suggestions from Nominatim API
  const fetchSuggestions = async (query) => {
    if (!query) return;
    // Use axios to fetch suggestions
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 5
      }
    });
    setSuggestions(response.data);
  };

  // Handle input change for address field
  const handleAddressChange = (event) => {
    const input = event.target.value;
    setAddress(input);
    fetchSuggestions(input); // Fetch suggestions as the user types
  };

  // Handle selection of a suggestion
  const handleSuggestionClick = (suggestion) => {
    const formattedAddress = formatAddress(suggestion);
    setAddress(formattedAddress);
    setSuggestions([]);
  };

  // Format address to desired format
  const formatAddress = (suggestion) => {
    const { house_number, road, city, state, postcode } = suggestion.address;
    return `${house_number} ${road}, ${city}, ${state} ${postcode}`;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent the default form submission behavior
    
    const formData = {
      address: address,
      kWh_consumption: kWh,
      escalator: escalator,
      selected_tariff: selectedTariff
    };

    // Send the data to Django or another backend
    console.log("Form data submitted:", formData);
    // Send the form data to the API using axios
    try {
      const response = await axios.post('http://localhost:8000/api/tariff/', formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        }
      });
      // Removed debugger; line
      if (response.status === 200) { // Check for successful response
        console.log("API response:", response.data);
        setApiResponse(response.data); // Store the API response in state

        setTariffs(response.data.tariffs);
        setCost(response.data.cost_first_year);
        setMostLikelyTariff(response.data.selected_tariff); // Set the most likely tariff
        setError('');
        // Fetch graph data
        fetchGraphData(kWh, response.data.selected_tariff.rate, escalator);

      } else {
        console.error("API error:", response.statusText);
        setApiResponse({ error: response.statusText }); // Store error in state
      }
    } catch (error) {
      console.error("Network error:", error);
      setError(error.response?.data?.error || 'An error occurred.'); // Optional chaining for safety
      setApiResponse({ error: "Network error occurred" }); // Store network error in state
    }
  };

  // Fetch graph data
  const fetchGraphData = async (kWh, averageRate, escalator) => {
    const response = await axios.post('http://localhost:8000/api/utility_cost/', {
      kWh_consumption: kWh,
      average_rate: averageRate,
      escalator: escalator
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${localStorage.getItem('token')}`
      }
    });

    if (response.status === 200) {
      const years = Array.from({ length: 20 }, (_, i) => i + 1);
      setGraphData({
        labels: years,
        datasets: [
          {
            label: 'Projected Utility Costs ($)',
            data: response.data.utility_costs,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
          },
        ],
      });
    }
  };

  return (
    <div className="container mt-5">
      <div className="box">
        <h1 className="title">Calculate Your Utility Cost</h1>
        {error && <div className="notification is-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Address Input */}
          <div className="field">
            <label className="label">Address</label>
            <div className="control has-icons-right" style={{display: 'grid'}}>
              <input
                className="input"
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="Enter your address"
                required
              />
              {/* Display suggestions in a dropdown */}
              {suggestions.length > 0 && (
                <div className="dropdown is-active">
                  <div className="dropdown-menu" style={{width: '100%', display: 'block'}}>
                    <div className="dropdown-content">
                      {suggestions.map((suggestion) => (
                        <a
                          key={suggestion.place_id}
                          className="dropdown-item"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion.display_name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* kWh Consumption Input */}
          <div className="field">
            <label className="label">kWh Consumption (1000-10000)</label>
            <div className="control">
              <input
                className="input"
                type="number"
                value={kWh}
                onChange={(e) => setKWh(e.target.value)}
                min="1000"
                max="10000"
                required
              />
            </div>
          </div>

          {/* Escalator Percentage Input */}
          <div className="field">
            <label className="label">Escalator Percentage (4%-10%)</label>
            <div className="control">
              <input
                className="input"
                type="number"
                value={escalator}
                onChange={(e) => setEscalator(e.target.value)}
                min="4"
                max="10"
                step="0.1"
                required
              />
            </div>
          </div>

          {/* Tariff Selection Dropdown */}
          <div className="field">
            <label className="label">Select Tariff</label>
            <div className="control">
              <div className="select is-fullwidth">
                <select
                    value={selectedTariff}
                    onChange={(e) => setSelectedTariff(e.target.value)}
                    disabled={tariffs.length === 0} // Disable if no tariffs are available
                >
                    <option value="">-- Select a Tariff --</option>
                    {tariffs.map((tariff) => (
                        <option key={tariff.name} value={tariff.name}>
                            {tariff.name} (${tariff.rate} per kWh)
                        </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="field is-grouped is-grouped-centered">
            <div className="control">
              <button className="button is-link">Submit</button>
            </div>
          </div>
        </form>
        
        {/* Display Average kWh */}
        {cost !== null && (
          <div className="notification is-primary">
            <strong>The average ¢/kWhr:</strong> ${mostLikelyTariff.rate}
          </div>
        )}

        {/* Display Cost */}
        {cost !== null && (
          <div className="notification is-primary">
            <strong>Estimated Cost for First Year:</strong> ${cost.toFixed(2)}
          </div>
        )}
        
        {/* Display Most Likely Tariff */}
        {mostLikelyTariff && (
          <div className="notification is-info">
            <strong>Most Likely Tariff:</strong> {mostLikelyTariff.name} at ${mostLikelyTariff.rate} per kWh
          </div>
        )}

        {/* Display Full List of Tariffs */}
        {tariffs.length > 0 && (
          <div className="mt-5">
            <h2 className="subtitle">Available Tariffs:</h2>
            <ul>
              {tariffs.map((tariff) => (
                <li key={tariff.name}>
                  {tariff.name} - ${tariff.rate} per kWh (Start Date: {tariff.start_date.toString()})
                </li>
              ))}
            </ul>
          </div>
        )}

        {graphData && (
          <div>
            <h2 className="subtitle">Projected Utility Costs Over 20 Years</h2>
            <Line data={graphData} />
          </div>
        )}

        {/* Display API Response */}
        {apiResponse && (
          <div className="mt-5">
            <h2 className="subtitle">API Response:</h2>
            <pre className="box" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TariffForm;
