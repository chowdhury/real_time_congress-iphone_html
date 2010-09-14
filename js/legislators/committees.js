LegislatorsCommitteesView.prototype = new View();
function LegislatorsCommitteesView() {
    var self = this;
    self.containerDiv = 'legislators_committees_body';
    self.currentChamber = 'House';
    self.destinationList = document.getElementById('committees_list');
    self.titleString = 'Committees';

    self.render = function() {
        self.setTitle(self.titleString);
        self.setLeftButton('back', 'legislators');
        self.setRightButton('reload');
        //application.initializeTriChamberSelect();
        self.loadChamber(self.currentChamber);
    }
    
    self.loadChamber = function(chamber) {
        self.currentChamber = chamber;
        self.setTitle("Committees");
        //self.dbGetLatest(chamber);
        if (!application.isViewed('legislators_committees_' + chamber)) {
            self.serverGetLatest(chamber);
        }
    }

    self.dataHandler = function(transaction, results) {
        resultsList = self.localToList(results);
        if (application.isViewed('legislators_committees_' + self.currentChamber) && resultsList.length == 0) {
            self.showEmptyResult('No Committees');
        } else {
            self.hideEmptyResult();
        }
        self.renderList(resultsList, self.destinationList);
        self.show();
    }

    self.dbGetLatest = function(chamber) {
        application.localDb.transaction(
            function(transaction) {
               transaction.executeSql("SELECT * FROM Committees WHERE chamber = ? ORDER BY Date ASC LIMIT 30", [chamber,], self.dataHandler);
            }
        );
    }

    self.reload = function() {
        self.serverGetLatest(self.currentChamber);
    }

    self.localToList = function(results) {
        latest_list = [];
        last_date = null;
        for (var i=0; i<results.rows.length; i++) {
            var row = results.rows.item(i);
            this_date = sqlDateToDate(row.date).format("mm/dd/yyyy");
            if (this_date != last_date) {
                friendly_date = sqlDateToDate(row.date).format("dddd, mmmm d")
                latest_list.push({row_type:'header', title:friendly_date, subtitle:'subby'});
                last_date = this_date;
            }
            latest_list.push({row_type:'content', meeting_date:row.date,
                committee:row.committee,
                description:row.matter,
                room:row.room});
        }
        return latest_list;
    }

    self.serverGetLatest = function(chamber) {
        self.showProgress();
        alert("hi?");
        //fetch hearing schedules from server
        jsonUrl = "http://" + application.sunlightServicesDomain + "/api/committees.getList.json?chamber=" + chamber + "&apikey=" + settings.sunlightServicesKey + "&jsonp=callback";
        alert(jsonUrl);
        
        $.jsonp({
            url: jsonUrl,
            cache: true,
            timeout: application.ajaxTimeout,
            success: function(data){
                for (i in data) {
                    self.addToLocal(data[i]);
                }
                application.markViewed('legislators_committees_' + chamber);
                self.dbGetLatest(chamber);
                self.hideProgress();
            },
            error: function(d, msg) {
                self.hideProgress();
                navigator.notification.alert("Can't connect to server", "Network Error");
            },
        });
    }

    self.addToLocal = function(row) {
        application.localDb.transaction(
            function(transaction) {
               transaction.executeSql("INSERT INTO Hearings (id, date, chamber, committee, committee_code, matter, room) VALUES (?, ?, ?, ?, ?, ?, ?)", [row.id, row.meeting_date, row.chamber, row.committee, row.committee_code, row.matter, row.room]);
            }
        );
    }

    self.renderRow = function(row, dest_list) {
        room_txt = '';
        if (row.room !='None') {
            room_txt = " (" + row.room + ")";
        }

        var newItem = document.createElement("li");

        var titleDiv = document.createElement("div");
        titleDiv.className = 'result_title';
        titleDiv.innerHTML = row.committee;

        var subDiv = document.createElement("div");
        subDiv.className = 'result_subtitle';
        subDiv.innerHTML = self.hearingFormat(row.meeting_date) + room_txt;

        var descDiv = document.createElement("div");
        descDiv.className = 'result_description';
        descDiv.innerHTML = row.description;

        newItem.appendChild(titleDiv);
        newItem.appendChild(subDiv);
        newItem.appendChild(descDiv);
        dest_list.appendChild(newItem);

    }

    self.hearingFormat = function(orig_date) {
        try {
            return sqlDateToDate(orig_date).format("h:MM TT");
        } catch(e) {
            return orig_date;
        }
    }
}
