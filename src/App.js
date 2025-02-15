import {BrowserRouter as Router, Navigate, Route, Routes, useNavigate,} from "react-router-dom";
import {MaterialReactTable} from "material-react-table";
import React, {useEffect, useState} from "react";
import {Alert, createTheme, CssBaseline, Snackbar, ThemeProvider} from "@mui/material"; // Import material components
import {DateRange} from "react-date-range";
import "react-date-range/dist/styles.css"; // Default Style
import "react-date-range/dist/theme/default.css"; // Theme Style

const Login = () => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "info", // "info", "success", "warning", "error"
    });

    const handleClose = () => {
        setSnackbar({...snackbar, open: false});
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        const username = event.target.username.value;
        const password = event.target.password.value;

        try {
            // Get CSRF token from cookies (or an endpoint)
            const csrfToken = document.cookie
                .split('; ')
                .find((row) => row.startsWith('csrftoken='))
                ?.split('=')[1];

            const response = await fetch("/api/login/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken, // Send CSRF token
                },
                body: JSON.stringify({username, password}),
            });

            const result = await response.json();

            if (response.ok) {
                const {access, refresh} = result;
                localStorage.setItem("accessToken", access);
                localStorage.setItem("refreshToken", refresh);
                window.location.href = "/employees";
            } else {
                // Handle errors
                console.error("Login error:", result.error);
                setSnackbar({
                    open: true,
                    message: result.error || "Invalid login credentials",
                    severity: "error",
                });
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setSnackbar({
                open: true,
                message: "Something went wrong. Please try again later.",
                severity: "error",
            });
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <h1>Login Page</h1>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label htmlFor="username">Username:</label>
                    <input type="text" id="username" name="username" required/>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" required/>
                    <button type="submit">Login</button>
                </form>
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleClose}
                >
                    <Alert
                        onClose={handleClose}
                        severity={snackbar.severity}
                        sx={{width: '100%'}}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </div>
        </div>
    );
};

const Employees = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const toggleCalendar = () => setIsCalendarOpen(!isCalendarOpen);

    const applyDateRange = async () => {
        const period_start = dateRange.startDate.toISOString().slice(0, 10);
        const period_end = dateRange.endDate.toISOString().slice(0, 10);

        try {
            const accessToken = localStorage.getItem("accessToken");
            if (!accessToken) {
                throw new Error("Unauthorized");
            }
            const response = await fetch("/api/employees/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    period_start,
                    period_end,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            setIsCalendarOpen(false);
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            setError(true);
            setSnackbar({
                open: true,
                message: "Failed to fetch employees. Please try again later.",
                severity: "error",
            });
        }
    };

    const navigate = useNavigate();

    const lightTheme = createTheme({
        palette: {
            mode: "light",
        },
    });

    const darkTheme = createTheme({
        palette: {
            mode: "dark",
        },
    });

    const toggleTheme = () => {
        setIsDarkMode((prevTheme) => !prevTheme);
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        navigate("/login");
    };

    const fetchEmployees = async (start, end) => {
        const period_start = start || dateRange.startDate.toISOString().slice(0, 10);
        const period_end = end || dateRange.endDate.toISOString().slice(0, 10);
        try {
            const accessToken = localStorage.getItem("accessToken");
            if (!accessToken) {
                throw new Error("No access token found");
            }

            const response = await fetch("/api/employees/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    period_start,
                    period_end,
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const newAccessToken = await refreshAccessToken();
                    if (newAccessToken) {
                        return fetchEmployees();
                    } else {
                        throw new Error("Could not refresh access token");
                    }
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            setError(true);
            setSnackbar({
                open: true,
                message: "Failed to fetch employees. Please try again later.",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const refreshAccessToken = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
                throw new Error("No refresh token found");
            }

            const response = await fetch("/api/token/refresh/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({refresh: refreshToken}),
            });

            if (!response.ok) {
                throw new Error("Failed to refresh token");
            }

            const {access} = await response.json();
            localStorage.setItem("accessToken", access);
            return access;
        } catch (err) {
            console.error("Error refreshing access token:", err);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            setSnackbar({
                open: true,
                message: "Session expired. Please log in again.",
                severity: "error",
            });
            navigate("/login");
            return null;
        }
    };

    useEffect(() => {
        document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
        fetchEmployees();
    }, [isDarkMode]);

    const columns = data.length
        ? Object.keys(data[0]).map((key) => ({
            accessorKey: key,
            header: key.replace(/_/g, " ").toUpperCase(),
        }))
        : [];

    return (
        <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
            <CssBaseline/>
            <div style={{padding: "20px"}}>
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: "20px"}}>
                    <div style={{display: "flex", alignItems: "center"}}>
                        <h1>Employees</h1>
                        <button
                            onClick={toggleCalendar}
                            style={{
                                marginLeft: "10px",
                                padding: "10px",
                                backgroundColor: "var(--button-bg-color)",
                                borderRadius: "5px",
                                cursor: "pointer",
                                color: "white",
                            }}
                        >
                            📅
                        </button>
                        <span style={{marginLeft: "10px", fontSize: "16px", cursor: "pointer"}}>
                            {`${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`}
                        </span>
                    </div>
                    <button
                        onClick={applyDateRange}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "var(--button-bg-color)",
                            borderRadius: "5px",
                            cursor: "pointer",
                            color: "white",
                        }}
                    >
                        Apply
                    </button>
                </div>
                {isCalendarOpen && (
                    <DateRange
                        ranges={[dateRange]}
                        onChange={(ranges) =>
                            setDateRange({
                                ...dateRange,
                                startDate: ranges.selection.startDate,
                                endDate: ranges.selection.endDate,
                            })
                        }
                        months={2}
                        direction="horizontal"
                        showMonthAndYearPicker
                    />
                )}
                <div>
                    <button
                        onClick={toggleTheme}
                        style={{
                            marginRight: "10px",
                            padding: "10px 20px",
                            backgroundColor: "var(--button-bg-color)",
                            color: "var(--button-text-color)",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                        }}
                    >
                        Toggle Theme
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "var(--button-bg-color)",
                            color: "var(--button-text-color)",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>Something went wrong. Please try again later.</p>
            ) : (
                <MaterialReactTable
                    columns={columns}
                    data={data}
                    enableColumnOrdering={true}
                    enableColumnResizing={true}
                    enableHiding={true}
                    enableSorting={true}
                />
            )}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({...prev, open: false}))}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({...prev, open: false}))}
                    severity={snackbar.severity}
                    sx={{width: "100%"}}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
};

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(null); // Null during initial check

    const checkLoginStatus = async () => {
        const accessToken = localStorage.getItem("accessToken");

        // Token not found
        if (!accessToken) {
            console.log("No token found. User is not logged in.");
            setIsLoggedIn(false);
            return;
        }

        try {
            const response = await fetch("/api/employees/", {
                method: "GET",
                headers: {Authorization: `Bearer ${accessToken}`},
            });

            if (response.status === 401) {
                console.warn("Token invalid or expired. Logging out the user.");
                localStorage.removeItem("accessToken");
                setIsLoggedIn(false);
            } else if (response.ok) {
                console.log("Token valid. User is logged in.");
                setIsLoggedIn(true);
            }
        } catch (err) {
            console.error("Error validating token:", err);
            setIsLoggedIn(false);
        }
    };

    useEffect(() => {
        checkLoginStatus(); // Dynamically check login status on mount
    }, []);

    // Avoid rendering routes until login status is known
    if (isLoggedIn === null) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                {/* Conditionally redirect based on login state */}
                <Route path="/" element={<Navigate to={isLoggedIn ? "/employees" : "/login"} replace/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route
                    path="/employees"
                    element={isLoggedIn ? <Employees/> : <Navigate to="/login" replace/>}
                />
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </Router>
    );
};

export default App;