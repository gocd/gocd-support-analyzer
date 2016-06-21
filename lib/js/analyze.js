function Thread(data) {
  this.id = m.prop(data.Id);
  this.name = m.prop(data.Name);
  this.state = m.prop(data.State);
  this.stackTrace = m.prop(data['Stack Trace']);

  this.lockedMonitors = m.prop(_.get(data, 'Lock Monitor Info.Locked Monitors'));
  this.lockedSynchronizers = m.prop(_.get(data, 'Lock Monitor Info.Locked Synchronizers'));
  this.waitingOn = m.prop(_.get(data, 'Lock Info.Locked On'));

  this.knownLocks = m.prop(_.concat(this.lockedMonitors(), this.lockedSynchronizers(), this.waitingOn()));
  this.isSleeping = m.prop(this.stackTrace().indexOf('java.lang.Thread.sleep(Native Method)') != -1);
}

function Group(key) {
  this.key = m.prop(key);
  this.values = m.prop([]);
  this.addValue = function (value) {
    this.values().push(value);
  };
}

function Threads(data) {
  var threads = m.prop(_.transform(data, function (result, threadData, threadId) {
    result[threadId] = new Thread(threadData);
  }, {}));

  this.size = function () {
    return this.threadIds().length;
  };

  this.threadIds = function () {
    return _.map(threads(), function (thread, threadId) {
      return thread.id();
    });
  };

  this.groupByStackTrace = function () {
    return _.reduce(threads(), function (groups, thread) {
      var currentThreadStackTrace = thread.stackTrace();
      var existingStackTraceGroup = _.find(groups, function (group) {
        return _.isEqual(group.key(), currentThreadStackTrace);
      });

      if (!existingStackTraceGroup) {
        existingStackTraceGroup = new Group(currentThreadStackTrace);
        groups.push(existingStackTraceGroup);
      }
      existingStackTraceGroup.addValue(thread);
      return groups;
    }, [])
  };

  this.lockedMonitors = function () {
    return _.reduce(threads(), function (groups, thread) {
      var items = thread.lockedMonitors();
      _.each(items, function (monitor) {
        var group = new Group(monitor);
        group.addValue(thread);
        groups.push(group);
      });
      return groups;
    }, []);
  };

  this.threadsWaitingOn = function (lockedMonitor) {
    return _.filter(threads(), function (thread) {
      if (_.isEmpty(thread.waitingOn())) {
        return;
      }
      return thread.waitingOn().IdentityHashCode === lockedMonitor.IdentityHashCode && thread.waitingOn().Class === lockedMonitor.Class;
    });
  };

  this.threadsHoldingOn = function (lockedMonitor) {
    return _.filter(threads(), function (thread) {
      if (_.isEmpty(lockedMonitor)) {
        return;
      }

      return _.some(thread.lockedMonitors(), function (eachLockedMonitor) {
        return eachLockedMonitor.IdentityHashCode === lockedMonitor.IdentityHashCode && eachLockedMonitor.Class === lockedMonitor.Class;
      });

    });
  };

  this.knownLocks = function () {
    return _(threads()).map(function (thread) {
      return thread.knownLocks();
    }).flatten().compact().uniqWith(function (a, b) {
      return a.Class === b.Class && a.IdentityHashCode === b.IdentityHashCode;
    }).value();
  }
}

var analyzeThreadDump = function(){
  m.mount(document.getElementById("analyze_report"), App);
}
