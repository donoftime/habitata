document.querySelector('.auth button').addEventListener("click", function(event) {
    event.preventDefault();
    var target = event.currentTarget;
    var credentials = captureCredentials(target)
    retrieveUserTaskData(credentials);
    

});

function captureCredentials (target) {
    return {
        'user_id': target.parentElement.querySelector('input.user_id').value,
        'api_key': target.parentElement.querySelector('input.api_key').value
    };
}

function retrieveUserTaskData (credentials) {
    var request = new XMLHttpRequest();
    request.onload = displayUserData;
    request.open("GET", "https://habitrpg.com/api/v2/user/tasks");
    request.setRequestHeader('x-api-user', credentials.user_id);
    request.setRequestHeader('x-api-key', credentials.api_key);
    request.send();
}

function displayUserData() {
    if (this.status < 200 && this.status >= 400) {
        alert("There was an error retrieving your data! " + this.status + " " + this.responseText);
    }

    var data = JSON.parse(this.responseText);
    timeline = collectTimelineDates(data);  // Global variable! :V
    console.log(timeline);
    var data_by_type = transformDataByType(data);
    console.log(data_by_type);

    var habit_chart = c3.generate({
        bindTo: '#habits',
        data: { json: data_by_type.habit }
    });

    var daily_chart = c3.generate({
        bindTo: '#dailies',
        data: { json: data_by_type.daily }
    });
    
}

// Collect a unique array of all the dates from all the histories in asc order
function collectTimelineDates(data) {
    return [].reduce.call(data, function(carry, item) {
        if (item.hasOwnProperty('history')) {
            return carry.concat(item.history.reduce(function(dates, historical_item) {
                var historical_date = new Date(historical_item.date);
                dates.push(historical_date.toDateString());
                return dates;
            }, []));
        }
        return carry;
    }, []).filter(function(date, index, self) {
        return self.indexOf(date) === index;
    }).sort(function(a,b) {
        return new Date(a) - new Date(b);
    });
}

function transformDataByType(data) {
    return [].reduce.call(data, function(carry, item) {
        if (!carry.hasOwnProperty(item.type)) carry[item.type] = {};
        if (item.hasOwnProperty('history')) {
            timeline.forEach(function(date_string) {
                var historical_value = item.history.reduce(function(historical_value, historical_entry) {
                    var entry_date = (new Date(historical_entry.date)).toDateString();
                    return entry_date === date_string ? historical_entry.value : historical_value; // we get the last value from that day
                }, 0); 
                if (!carry[item.type].hasOwnProperty(item.text)) carry[item.type][item.text] = [];
                carry[item.type][item.text].push(historical_value);
            });
            return carry;
        }
        carry[item.type][item.text] = item;
        return carry;
    }, {});
}