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
    var timeline = collectTimelineDates(data);
    var data_by_type = transformDataByType(data, timeline);

    document.querySelector('main').classList.remove('hide-charts');

    habit_chart = c3.generate({
        bindto: '#habits',
        data: { json: data_by_type.habit },
        zoom: { enabled: true }
    });

    daily_chart = c3.generate({
        bindto: '#dailies',
        data: { json: data_by_type.daily },
        axis: { x: { extent: [5, 10] } },
        subchart: { show: true }
    });
}

// Collect a unique array of all the dates from all the histories in asc order
function collectTimelineDates(data) {
    return [].reduce.call(data, function(carry, item) {
        if (item.hasOwnProperty('history')) return carry.concat(collectDatesFromTaskHistory(item));
        return carry;
    }, []).filter(function(date, index, self) {
        return self.indexOf(date) === index;  // this reduces it to a unique list
    }).sort(function(a,b) {
        return new Date(a) - new Date(b);  // and puts it in ascending order
    });
}

function transformDataByType(data, timeline) {
    return [].reduce.call(data, function(carry, item) {
        if (!carry.hasOwnProperty(item.type)) carry[item.type] = {};
        if (item.hasOwnProperty('history')) return collectHistoricalValuesForEachDateInTimelineForATask(timeline, item, carry);
        carry[item.type][item.text] = item;  // otherwise just throw all the information in there until I think of something to do with it...
        return carry;
    }, {});
}

function collectDatesFromTaskHistory(task) {
    return task.history.reduce(function(dates, historical_item) {
        var historical_date = new Date(historical_item.date);
        dates.push(historical_date.toDateString());
        return dates;  // here we collect all the dates from each item's history
    }, [])
}

function collectHistoricalValuesForEachDateInTimelineForATask(timeline, item, carry) {
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