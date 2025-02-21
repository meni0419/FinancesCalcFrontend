import React, {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {MaterialReactTable} from "material-react-table";
import {Alert, createTheme, CssBaseline, IconButton, Snackbar, ThemeProvider, Modal, Button} from "@mui/material";
import {DateRange} from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import {Brightness4, Brightness7, Logout as LogoutIcon, SwapHoriz, SwapVert, CalendarMonth as CalendarMonthIcon} from "@mui/icons-material";


const Employees = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [columns, setColumns] = useState([]);
    const [columnSizing, setColumnSizing] = useState({
        //initials: 30,
        photo: 75,
    });

    const [columnVisibility, setColumnVisibility] = useState({});
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
    });

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

    const loadTheme = async () => {
        try {
            await fetchTheme();
        } catch (error) {
            console.error("Failed to load theme:", error);
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

        // Обновляем атрибут data-theme на body
        document.body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');

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
    const loadEmployees = async () => {
        await fetchEmployees();
    };

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
        setColumnVisibility((prev) => {
            const newVisibility = typeof updater === "function" ? updater(prev) : updater;

            // Обновляем состояние `isVisible` в массиве `columns`
            const updatedColumns = columns.map((col) => ({
                ...col,
                isVisible: newVisibility[col.accessorKey] !== false,
            }));

            // Сортируем столбцы: сначала видимые, затем невидимые
            const sortedColumns = updatedColumns.sort((a, b) => {
                if (a.isVisible === b.isVisible) return a.order - b.order; // Если видимость одинаковая, сохраняем порядок
                return a.isVisible ? -1 : 1; // Видимые столбцы идут первыми
            });

            // Обновляем порядок столбцов
            const finalColumns = sortedColumns.map((col, index) => ({
                ...col,
                order: index,
            }));

            // Сохраняем изменения на сервере
            saveColumns(finalColumns);

            // Возвращаем новое состояние видимости
            return newVisibility;
        });
    };

    const handleColumnOrderChange = (updater) => {
        setColumns((prevColumns) => {
            const newColumns = typeof updater === 'function' ? updater(prevColumns) : updater;

            const normalizedColumns = newColumns
                .map((col) => {
                    if (typeof col === 'string' && col.startsWith('mrt-')) {
                        return null;
                    }

                    if (typeof col === 'object') {
                        return col;
                    }

                    const matchedCol = prevColumns.find((prevCol) => prevCol.id === col || prevCol.accessorKey === col);
                    if (matchedCol) {
                        return matchedCol;
                    }

                    return null;
                })
                .filter(Boolean);

            // Синхронизируем видимость столбцов с актуальным состоянием columnVisibility
            const updatedColumns = normalizedColumns.map((col, index) => ({
                ...col,
                isVisible: columnVisibility[col.accessorKey] !== false, // Используем актуальное состояние видимости
                order: index,
            }));

            // Сохраняем изменения на сервере
            saveColumns(updatedColumns);

            return updatedColumns;
        });
    };

    const loadColumns = async () => {
        try {
            const fetchWorkspace = await fetchOption("workspace");
            const columnData = fetchWorkspace.value;

            if (Array.isArray(columnData)) {
                const updatedColumns = columnData.map((col, index) => ({
                    id: col.accessorKey,
                    accessorKey: col.accessorKey,
                    header: col.header || col.accessorKey,
                    order: col.order || index,
                    isVisible: col.isVisible !== undefined ? col.isVisible : true,
                    Cell: col.accessorKey === 'photo' ? ({cell}) => {
                        return cell.getValue() ? (
                            <img
                                src={cell.getValue()}
                                alt="User Photo"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/local/data/file/nophoto.png';
                                }}
                            />
                        ) : <div>No Photo</div>;
                    } : undefined,
                }));

                // Сортируем столбцы: сначала видимые, затем невидимые
                const sortedColumns = updatedColumns.sort((a, b) => {
                    if (a.isVisible === b.isVisible) return a.order - b.order; // Если видимость одинаковая, сохраняем порядок
                    return a.isVisible ? -1 : 1; // Видимые столбцы идут первыми
                });

                // Обновляем порядок столбцов
                const finalColumns = sortedColumns.map((col, index) => ({
                    ...col,
                    order: index,
                }));

                setColumns(finalColumns);

                // Инициализация состояния видимости столбцов
                const visibilityState = {};
                finalColumns.forEach(col => {
                    visibilityState[col.accessorKey] = col.isVisible;
                });
                setColumnVisibility(visibilityState);
            } else {
                console.error("Invalid column data format:", fetchWorkspace);
            }
        } catch (error) {
            console.error("Error fetching columns:", error);
            setColumns([]);
        }
    };
    const saveColumns = async (updatedColumns) => {
        try {
            const accessToken = localStorage.getItem("accessToken");
            const payload = updatedColumns.map((col) => ({
                id: col.accessorKey,
                accessorKey: col.accessorKey,
                header: col.header,
                isVisible: col.isVisible,
                order: col.order,
            }));

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

    const saveToggleDensity = async (density) => {
        try {
            const accessToken = localStorage.getItem("accessToken");
            const response = await fetch("/api/options/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({key: "toggleDensity", value: density}),
            });

            if (!response.ok) {
                throw new Error("Failed to save toggle density");
            }
            console.log("Toggle density saved successfully");
        } catch (error) {
            console.error("Error saving toggle density:", error);
        }
    };

    const saveSMAButtons = async (showSMAButtons) => {
        try {
            const accessToken = localStorage.getItem("accessToken");
            const payload = {key: "showSMAButtons", value: String(showSMAButtons)}; // Преобразование к булевому значению

            const response = await fetch("/api/options/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload), // Передаем только сериализуемый объект
            });

            if (!response.ok) {
                throw new Error("Failed to save sort move action buttons");
            }
            console.log("Sort move action buttons saved successfully");
        } catch (error) {
            console.error("Failed to save sort move action buttons:", error);
        }
    };

    const [density, setDensity] = useState("comfortable");
    const loadToggleDensity = async () => {
        try {
            const response = await fetchOption("toggleDensity");
            setDensity(response.value || "comfortable"); // Устанавливаем значение или значение по умолчанию
        } catch (error) {
            console.error("Failed to load density:", error);
        }
    };
    const handleToggleDensity = async (newDensity) => {
        await saveToggleDensity(newDensity);
        setDensity(newDensity);
    };

    const [showSMAButtons, setShowSMAButtons] = useState(false);
    const loadShowSMAButtons = async () => {
        try {
            const response = await fetchOption("showSMAButtons"); // fetchOption возвращает объект с `response.value`

            // Преобразуем строку в булево значение
            const booleanValue = response.value === "true";

            setShowSMAButtons(booleanValue); // Устанавливаем преобразованное значение
        } catch (error) {
            console.error("Failed to load show sort move action buttons:", error);
        }
    };
    const handleToggleShowSMAButtons = async (newShowSMAButtons) => {
        await saveSMAButtons(newShowSMAButtons);
        setShowSMAButtons(newShowSMAButtons);
    };

    useEffect(() => {
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        loadShowSMAButtons();
        loadToggleDensity();
        loadTheme();
        loadColumns(); // Вызов исправленного метода
        loadEmployees();
    }, [fetchEmployees, dateRange.startDate, dateRange.endDate, isDarkMode]);

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
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>Something went wrong. Please try again later.</p>
            ) : (
                <MaterialReactTable
                    key={columns.map(col => col.accessorKey).join('-')}
                    columns={columns}
                    data={data}
                    enableColumnOrdering={showSMAButtons}
                    enableSorting={showSMAButtons}
                    enableColumnActions={showSMAButtons}
                    enableColumnPinning={showSMAButtons}
                    enableColumnResizing={true}
                    columnResizeMode="onChange"
                    onColumnSizingChange={(newSizing) => setColumnSizing(newSizing)}
                    enableHiding={true}
                    initialState={{columnVisibility, density, showSMAButtons, pagination: {pageSize: 50}}}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onColumnOrderChange={handleColumnOrderChange}
                    onDensityChange={handleToggleDensity}
                    state={{columnVisibility, density, showSMAButtons, columnSizing}}
                    renderTopToolbarCustomActions={({table}) => (
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <IconButton
                                onClick={() => handleToggleShowSMAButtons(!showSMAButtons)} // Передается значение true/false
                                size="small"
                                style={{
                                    padding: "8px",
                                    borderRadius: "50%",
                                    color: "inherit",
                                    position: "absolute",
                                    right: "205px",
                                    top: "10px",
                                    zIndex: 1,
                                    transition: "background-color 0.3s",
                                    backgroundColor: "transparent",
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(200, 200, 200, 0.1)"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                title={showSMAButtons ? "Hide Sort/Move/Action" : "Show Sort/Move/Action"}
                            >
                                {showSMAButtons ? <SwapHoriz/> : <SwapVert/>}
                            </IconButton>
                            <IconButton
                                onClick={toggleTheme}
                                size="small"
                                style={{
                                    padding: "8px",
                                    borderRadius: "50%",
                                    color: "inherit",
                                    position: "absolute",
                                    right: "245px",
                                    top: "10px",
                                    zIndex: 1,
                                    transition: "background-color 0.3s",
                                }}
                                onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(200, 200, 200, 0.1)")}
                                onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                                title={isDarkMode ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
                            >
                                {isDarkMode ? <Brightness7/> : <Brightness4/>}
                            </IconButton>
                            <IconButton
                                onClick={handleLogout}
                                size="small"
                                style={{
                                    padding: "8px",
                                    borderRadius: "50%",
                                    color: "inherit",
                                    position: "absolute",
                                    right: "285px",
                                    top: "10px",
                                    zIndex: 1,
                                    transition: "background-color 0.3s",
                                }}
                                onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(200, 200, 200, 0.1)")}
                                onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                                title="Выйти из системы"
                            >
                                <LogoutIcon/>
                            </IconButton>
                        </div>
                    )}
                    mrtColumns={{
                        enableSorting: showSMAButtons,
                        enableColumnOrdering: showSMAButtons,
                    }}
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

export default Employees;