var App = {
  controller: function (args) {
    return {
      data: function(){
        var data;
        try{
          data = JSON.parse(document.getElementById('thread_dump_json').value)
        }catch(e){
          alert(e);
        }
        return data;
      }
    };
  },
  view: function (ctrl) {
    var threads = new Threads(ctrl.data()['Thread Information']['Stack Trace']);

    return m("div", [
        m(ThreadCountComponent, threads),
        m(ThreadsGroupedByStacktraceComponent, threads),
        m(SynchronizersComponent, threads)
      ]
    );
  }
};

var ThreadCountComponent = {
  view: function (ctrl, threads) {
    return m('h2', [threads.size(), ' threads found']);
  }
};

var WaitingOnComponent = {
  view: function (ctrl, waitingOn) {
    var tag = waitingOn.Class + '@' + waitingOn.IdentityHashCode;
    return m('a[href=#waiting-on-' + tag + ']', tag);
  }
};


var ThreadStateInfoComponent = {
  view: function (ctrl, thread) {
    var state = 'UNKNOWN';
    if (thread.isSleeping()) {
      state = ': sleeping';
    } else if (thread.stackTrace().length == 0) {
      state = ': non-Java thread';
    } else if (thread.state() == 'WAITING' || thread.state() == 'TIMED_WAITING') {
      state = [': awaiting notification on [', [m(WaitingOnComponent, thread.waitingOn())], ']'];
    } else if (thread.state() == 'BLOCKED') {
      state = [': waiting to acquire [', [m(WaitingOnComponent, thread.waitingOn())], ']'];
    } else if (thread.state() == 'RUNNABLE') {
      state = [': running, holding [', [m(WaitingOnComponent, thread.waitingOn())], ']'];
    }

    return m('div#thread-' + thread.id(),
      [
        m('code', ['"', thread.name(), '" ', state])
      ]
    );
  }
};

var ThreadsGroupedByStacktraceComponent = {
  view: function (ctrl, threads) {
    var threadsGroupedByStacktrace = _(threads.groupByStackTrace()).sortBy(function (group) {
      return group.values().length;
    }).reverse().value();

    return m('div', _.map(threadsGroupedByStacktrace, function (group) {
      var isStackTracePresent = group.key().length > 0;
      var stackTrace, whichTrace;
      if (isStackTracePresent) {
        stackTrace = group.key().join('\n\t');
        whichTrace = 'this';
      } else {
        stackTrace = '<empty stack>';
        whichTrace = 'no'
      }
      return m('div', [
        m('strong', [group.values().length, " threads with ", whichTrace, " stack:"]),
        m('div', _.map(group.values(), function (thread) {
          return m(ThreadStateInfoComponent, thread);
        })),
        m('pre', ['\t', stackTrace])
      ])
    }));
  }
};

var LinkToThreadComponent = {
  view: function (ctrl, thread) {
    return m('code', m('a.thread[href=#thread-' + thread.id() + ']', thread.name()));
  }
};

var SynchronizersComponent = {
  view: function (ctrl, threads) {
    var knownLocks = _(threads.knownLocks()).sortBy(function (knownLock) {
      return threads.threadsWaitingOn(knownLock).length;
    }).reverse().value();

    var table = _.map(knownLocks, function (knownLock) {
      var threadsThatAreWaiting = threads.threadsWaitingOn(knownLock);
      var threadsThatAreHolding = threads.threadsHoldingOn(knownLock);

      var waitingOnElements = [];
      var holdingOnElements = [];

      if (threadsThatAreWaiting.length > 0) {
        waitingOnElements = [
          threadsThatAreWaiting.length + ' threads waiting to take lock:',
          m('br'),
          _.map(threadsThatAreWaiting, function (thread) {
            return [
              m(LinkToThreadComponent, thread),
              m('br')
            ];
          })
        ]
      }

      if (threadsThatAreHolding.length > 0) {
        holdingOnElements = [
          'Held by:',
          m('br'),
          m(LinkToThreadComponent, threadsThatAreHolding[0])
        ]
      }

      var tag = knownLock.Class + '@' + knownLock.IdentityHashCode;
      return m('tr', {id: 'waiting-on-' + tag}, [
        m('td', m('code', [knownLock.Class, ' ', knownLock.IdentityHashCode])),
        m('td', [
            holdingOnElements,
            m('br'),
            waitingOnElements
          ]
        )
      ])
    });

    return m('div', [
      m('h1#synchronizers', 'Synchronizers'),
      m('table', table)
    ]);
  }
};
