// src/components/Logout.js

import React, { useEffect } from 'react';
import axios from 'axios';

const Logout = ({ setAuthToken }) => {

    useEffect(() => {
        const logoutUser = async () => {
            try {
                await axios.post('http://localhost:8000/api/logout/', {}, {
                    headers: {
                        'Authorization': `Token ${localStorage.getItem('token')}`
                    }
                });
                setAuthToken(null);
                localStorage.removeItem('token');
            } catch (err) {
                console.error("Logout failed.", err);
            }
        };
        logoutUser();
    }, [setAuthToken]);

    return (
        <div className="container mt-5">
            <div className="box">
                <h1 className="title">Logging Out...</h1>
            </div>
        </div>
    );
};

export default Logout;
