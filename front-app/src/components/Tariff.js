import React, { useState } from 'react';

const TariffForm = () => {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [kWh, setKWh] = useState(1000); // Default to minimum 1000 kWh
  const [escalator, setEscalator] = useState(4); // Default to minimum 4%
  const [apiResponse, setApiResponse] = useState(null);

  
  // Fetch address suggestions from Nominatim API
  const fetchSuggestions = async (query) => {
    if (!query) return;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5`);
    const data = await response.json();
    setSuggestions(data);
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
    debugger;
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
    };

    // Send the data to Django or another backend
    console.log("Form data submitted:", formData);
    // Send the form data to the API
    try {
      const response = await fetch('http://localhost:8000/api/tariff/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log("API response:", result);
        setApiResponse(result); // Store the API response in state
      } else {
        console.error("API error:", response.statusText);
        setApiResponse({ error: response.statusText }); // Store error in state
      }
    } catch (error) {
      console.error("Network error:", error);
      setApiResponse({ error: "Network error occurred" }); // Store network error in state
    }
  };

  return (
    <div className="container mt-5">
      <div className="box">
        <h1 className="title has-text-centered">Tariff Tracker</h1>
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

          {/* Submit Button */}
          <div className="field is-grouped is-grouped-centered">
            <div className="control">
              <button className="button is-link">Submit</button>
            </div>
          </div>
        </form>

        {/* Display API Response */}
        {apiResponse && (
          <div className="mt-5">
            <h2 className="subtitle">API Response:</h2>
            <pre className="box">{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TariffForm;
