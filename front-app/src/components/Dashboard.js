// src/components/Dashboard.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = ({ authToken }) => {
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProtectedData = async () => {
            try {
                const res = await axios.get('/api/protected/', {
                    headers: {
                        'Authorization': `Token ${authToken}`
                    }
                });
                setMessage(res.data.message);
            } catch (err) {
                setMessage('Failed to fetch protected data.');
            }
        };
        fetchProtectedData();
    }, [authToken]);

    return (
        <div className="container mt-5">
            <div className="box">
                <h1 className="title">Dashboard</h1>
                <p>{message}</p>
            </div>
        </div>
    );
};

export default Dashboard;
