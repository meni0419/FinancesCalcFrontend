import {BrowserRouter as Router, Navigate, Route, Routes, useNavigate,} from "react-router-dom";
import {MaterialReactTable} from "material-react-table";
import React, {useEffect, useState, useCallback} from "react";
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
    const [columns, setColumns] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const navigate = useNavigate();
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
    const darkTheme = createTheme({
        palette: {
            mode: "dark",
        },
    });
    const lightTheme = createTheme({
        palette: {
            mode: "light",
        },
    });
    const fetchTheme = async () => {
        const accessToken = localStorage.getItem("accessToken");
        try {
            const response = await fetch("/api/theme/", {
                method: "GET",
                headers: {Authorization: `Bearer ${accessToken}`},
            });

            if (!response.ok) throw new Error("Failed to fetch theme");

            const {theme} = await response.json();
            setIsDarkMode(theme === 2); // 2 — темная, 1 — светлая
        } catch (error) {
            console.error("Error loading theme:", error);
        }
    };
    const saveTheme = async (theme) => {
        const accessToken = localStorage.getItem("accessToken");
        try {
            const response = await fetch("/api/theme/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({theme}),
            });

            if (!response.ok) throw new Error("Failed to save theme");
            console.log("Theme updated successfully");
        } catch (error) {
            console.error("Error saving theme:", error);
        }
    };

    const toggleTheme = async () => {
        const newTheme = isDarkMode ? 1 : 2; // 1 — светлая, 2 — темная
        setIsDarkMode(!isDarkMode);

        try {
            await saveTheme(newTheme);
            console.log("Theme saved successfully");
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        navigate("/login");
    };

    const fetchEmployees = useCallback(async (start, end) => {
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

                    async function refreshAccessToken() {
                        const refreshToken = localStorage.getItem("refreshToken");
                        try {
                            const response = await fetch("/api/refresh-token/", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({refresh_token: refreshToken}),
                            });

                            if (!response.ok) throw new Error("Failed to refresh access token");

                            const {access_token} = await response.json();
                            localStorage.setItem("accessToken", access_token);
                            return access_token;
                        } catch (error) {
                            console.error("Error refreshing access token:", error);
                            return null;
                        }
                    }

                    if (newAccessToken) {
                        return fetchEmployees(start, end); // Аргументы повторного вызова
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
            if (error.message === "No access token found") navigate("/login"); // Добавлено перенаправление на логин
        } finally {
            setLoading(false);
        }
    }, [dateRange.startDate, dateRange.endDate]);
    const saveColumns = async (updatedColumns) => {
        try {
            const accessToken = localStorage.getItem("accessToken");
            const payload = updatedColumns.map((col) => ({
                id: col.accessorKey, // Добавляем id
                accessorKey: col.accessorKey,
                header: col.header,
                isVisible: col.isVisible,
                order: col.order,
            }));

            console.log("Payload to save:", payload); // Логируем данные перед отправкой

            const response = await fetch(`/api/options/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({key: "workspace", value: payload}),
            });

            if (!response.ok) {
                throw new Error(`Failed to save columns: ${response.statusText}`);
            }
            console.log("Columns saved successfully");
        } catch (error) {
            console.error("Error saving columns:", error);
        }
    };
    useEffect(() => {
        const loadTheme = async () => {
            try {
                await fetchTheme();
            } catch (error) {
                console.error("Failed to load theme:", error);
            }
        };

        const loadColumns = async () => {
            try {
                const result = await fetchOption("workspace");
                const columnData = result.value;

                if (Array.isArray(columnData)) {
                    const updatedColumns = columnData.map((col, index) => ({
                        id: col.accessorKey, // Убедитесь, что id уникален
                        accessorKey: col.accessorKey,
                        header: col.header || col.accessorKey,
                        order: col.order || index,
                        isVisible: col.isVisible !== undefined ? col.isVisible : true,
                    })).sort((a, b) => a.order - b.order);

                    setColumns(updatedColumns);

                    // Инициализация состояния видимости столбцов
                    const visibilityState = {};
                    updatedColumns.forEach(col => {
                        visibilityState[col.accessorKey] = col.isVisible;
                    });
                    setColumnVisibility(visibilityState);
                } else {
                    console.error("Invalid column data format:", result);
                }
            } catch (error) {
                console.error("Error fetching columns:", error);
                setColumns([]);
            }
        };

        const loadEmployees = async () => {
            await fetchEmployees();
        };

        loadTheme();
        loadColumns(); // Вызов исправленного метода
        loadEmployees();
    }, [fetchEmployees, dateRange.startDate, dateRange.endDate]);

    const fetchOption = async (key) => {
        const accessToken = localStorage.getItem("accessToken");
        try {
            const response = await fetch(`/api/options/?key=${key}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch option");
            }

            const result = await response.json();
            return result; // Убедитесь, что result.value является массивом объектов
        } catch (error) {
            console.error("Error fetching option:", error);
            return {value: []}; // Возвращаем пустой массив при ошибке
        }
    };

    const handleColumnVisibilityChange = (updater) => {
        // Обновляем состояние видимости столбцов
        setColumnVisibility((prev) => {
            const newVisibility = typeof updater === "function" ? updater(prev) : updater;

            // Обновляем состояние `isVisible` в массиве `columns`
            const updatedColumns = columns.map((col) => ({
                ...col,
                isVisible: newVisibility[col.accessorKey] !== false, // Если столбец скрыт, isVisible будет false
            }));

            // Сохраняем изменения в БД
            saveColumns(updatedColumns);

            return newVisibility;
        });
    };
    const handleColumnOrderChange = (updater) => {
        setColumns((prevColumns) => {
            // Получаем массив новых колонок
            const newColumns = typeof updater === 'function' ? updater(prevColumns) : updater;

            // Шаг 1: Проверить и преобразовать newColumns
            // Если newColumns содержит строки, необходимо сопоставить их с существующими колонками
            const normalizedColumns = newColumns.map((col) => {
                // Если колонка – это объект, оставляем её как есть
                if (typeof col === 'object') {
                    return col;
                }

                // Если колонка – это строка, пытаемся найти её в prevColumns
                const matchedCol = prevColumns.find((prevCol) => prevCol.id === col || prevCol.accessorKey === col);

                if (matchedCol) {
                    return matchedCol;
                }

                // Если колонка не найдена, логируем ошибку и пропускаем её
                console.error('Invalid column detected:', col);
                return null;
            }).filter(Boolean); // Убираем "null" из массива

            // Шаг 2: Присваиваем новый порядок всем колонкам
            const updatedColumns = normalizedColumns.map((col, index) => ({
                ...col,
                order: index, // Устанавливаем порядок как числовой индекс
            }));

            // Шаг 3: Сохраняем изменения на сервере
            saveColumns(updatedColumns);

            return updatedColumns;
        });
    };
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
                    initialState={{columnVisibility}}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onColumnOrderChange={handleColumnOrderChange}
                    state={{columnVisibility}}
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
        const period_start = new Date().toISOString().split("T")[0]; // example value
        const period_end = period_start;

        // Token not found
        if (!accessToken) {
            console.log("No token found. User is not logged in.");
            setIsLoggedIn(false);
            return;
        }

        try {
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
        const validateStatus = async () => {
            try {
                await checkLoginStatus();
            } catch (error) {
                console.error("Failed to check login status:", error);
            }
        };

        validateStatus();// Dynamically check login status on mount
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
    )
        ;
};

export default App;