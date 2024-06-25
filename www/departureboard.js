const debug = true; // Set to true for debugging

// Function to get the appropriate icon based on the category
function getCategoryIcon(category) {
    switch (category) {
        case 'S':
            return '🚋'; // Tram icon
        case 'B':
            return '🚌'; // Bus icon
        default:
            return ''; // No icon for other categories
    }
}

// Function to extract the part of destination after the comma or "Bahnhof"
function extractDestination(destination) {
    if (destination.includes(', Bahnhof')) {
        const parts = destination.split(', ');
        return 'Bhf ' + parts[0].split(' ').slice(-1).join(' ');
    } else {
        const parts = destination.split(', ');
        return parts.length > 1 ? parts[1] : destination;
    }
}

// Function to calculate minutes from now to departure time, considering delay
function calculateMinutesFromNow(departureTime, delay) {
    const now = new Date();
    const departure = new Date(departureTime);
    const differenceInMs = departure - now;
    var differenceInMinutes = Math.floor(differenceInMs / (1000 * 60)); // Convert milliseconds to minutes
    if (differenceInMinutes < 0) {
        differenceInMinutes = 0
    }
    const timeToDeparture = differenceInMinutes + delay
    return timeToDeparture
}

function TimeStamp() {
    // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat#examples
    
    options = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
        // dateStyle: 'short',
        // timeStyle: 'long',
        // timeZone: 'Australia/Sydney',
    }

    return new Intl.DateTimeFormat('en-GB', options).format(new Date())
}

function log(message) {
    console.log(TimeStamp() + " | " + message);
}


function fetchDataAndUpdateTable() {
    console.info(TimeStamp() + " | Data processing started");

    const selectedValue = document.getElementById('station-id').value;
    
    if (!selectedValue) {
        log('Please select a station.');
        return;
    }
    
    const stationIds = selectedValue.split(',');
    // const stationIds = [8502222,8573726];


    const apiUrlBase = 'https://transport.opendata.ch/v1/stationboard';
    const promises = [];

    // Fetch data for each station ID and store the promises in an array
    stationIds.forEach(stationId => {
        const apiUrl = `${apiUrlBase}?id=${stationId}&type=departure&limit=4&fields[]=stationboard/category&fields[]=stationboard/number&fields[]=stationboard/to&fields[]=stationboard/stop/departure&fields[]=stationboard/stop/delay`;
        promises.push(fetch(apiUrl));
    });

    // Execute all promises concurrently
    Promise.all(promises)
        .then(responses => Promise.all(responses.map(response => response.json())))
        .then(datasets => {
            // Combine data from all datasets into a single array
            const combinedData = datasets.flatMap(dataset => dataset.stationboard);

            // Sort the combined data by departure time
            combinedData.sort((a, b) => new Date(a.stop.departure) - new Date(b.stop.departure));

            // Clear existing data from the table
            const dataContainer = document.getElementById('data-container');
            dataContainer.innerHTML = '';

            // Display the data on the webpage
            combinedData.forEach(train => {
                // Create a new row for each train
                const row = document.createElement('tr');

                // Populate the row with train data
                const trainCell = document.createElement('td');
                trainCell.classList.add('right-align'); // Align train number to the right
                const categoryIcon = getCategoryIcon(train.category);
                const trainNumber = document.createElement('span');
                trainNumber.textContent = train.number;
                const iconSpan = document.createElement('span');
                iconSpan.classList.add('icon');
                iconSpan.textContent = categoryIcon;
                trainCell.appendChild(iconSpan);
                trainCell.appendChild(trainNumber);
                row.appendChild(trainCell);

                const destinationCell = document.createElement('td');
                destinationCell.classList.add('left-align'); // Align destination to the left
                const destination = extractDestination(train.to);
                destinationCell.textContent = destination;
                row.appendChild(destinationCell);

                const departureCell = document.createElement('td');
                departureCell.textContent = calculateMinutesFromNow(train.stop.departure, train.stop.delay) + ' min';
                row.appendChild(departureCell);

                if (debug) {
                    const minutesFromNow = calculateMinutesFromNow(train.stop.departure, 0);
                    const minutesFromNowWithDelay = calculateMinutesFromNow(train.stop.departure, train.stop.delay);
                    const debugInfo = "Train Number: " + train.number + "<br>" +
                        "Destination: " + train.to + "<br>" +
                        "Scheduled departure: " + (minutesFromNow >= 0 ? minutesFromNow : `Departed (${minutesFromNow})`) + "<br>" +
                        "Delay: " + train.stop.delay + "<br>" +
                        "Departure in " + minutesFromNowWithDelay + " minutes";
                    console.debug(debugInfo.replaceAll("<br>", "\n") + "\n");
                    const debugCell = document.createElement('td');
                    debugCell.classList.add('debug-cell');
                    debugCell.innerHTML = debugInfo;
                    row.appendChild(debugCell);
                }

                // Append the row to the table body
                dataContainer.appendChild(row);
            });
            console.info(TimeStamp() + " | Data processing completed");
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}
        
// Call fetchDataAndUpdateTable initially to fetch data when the page loads
// fetchDataAndUpdateTable(); // You may choose not to fetch data on page load

// Reload data when the "Fetch Data" button is clicked
// document.getElementById('fetch-button').addEventListener('click', fetchDataAndUpdateTable);

// Refresh data every 5 seconds
setInterval(fetchDataAndUpdateTable, 5000); // You may choose not to auto-refresh data