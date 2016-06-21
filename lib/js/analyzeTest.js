describe('Threads', function () {
  var stackTrace = [
    "com.thoughtworks.go.server.controller.AgentRegistrationController.checkAgentStatus(AgentRegistrationController.java:86)",
    "sun.reflect.GeneratedMethodAccessor92.invoke(Unknown Source)",
    "sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)",
    "java.lang.reflect.Method.invoke(Method.java:606)",
    "org.springframework.web.bind.annotation.support.HandlerMethodInvoker.invokeHandlerMethod(HandlerMethodInvoker.java:176)",
    "org.springframework.web.servlet.mvc.annotation.AnnotationMethodHandlerAdapter.invokeHandlerMethod(AnnotationMethodHandlerAdapter.java:436)",
    "org.springframework.web.servlet.mvc.annotation.AnnotationMethodHandlerAdapter.handle(AnnotationMethodHandlerAdapter.java:424)",
    "org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:923)",
    "org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:852)",
    "...snipped...",
    "java.lang.Thread.run(Thread.java:745)"
  ];

  var threadData = {
    "Id": 30,
    "Name": "qtp946055886-30",
    "State": "BLOCKED",
    "Lock Monitor Info": {
      "Locked Monitors": [],
      "Locked Synchronizers": []
    },
    "Blocked Info": {
      "Blocked Time": null,
      "Blocked Count": 12
    },
    "Time Info": {
      "Waited Time": null,
      "Waited Count": 89
    },
    "Lock Info": {
      "Locked On": {
        "Class": "java.lang.String",
        "Hashcode": 667253389
      },
      "Lock Owner Thread Id": 26,
      "Lock Owner Thread Name": "qtp946055886-26"
    },
    "State Info": {
      "Suspended": false,
      "InNative": false
    },
    "Stack Trace": stackTrace
  };

  describe("Thread", function () {
    it("should parse a thread from JSON", function () {
      var thread = new Thread(threadData);
      expect(thread.id()).toBe(30);
      expect(thread.name()).toBe("qtp946055886-30");
      expect(thread.state()).toBe("BLOCKED");
      expect(thread.stackTrace()).toEqual([
        "com.thoughtworks.go.server.controller.AgentRegistrationController.checkAgentStatus(AgentRegistrationController.java:86)",
        "sun.reflect.GeneratedMethodAccessor92.invoke(Unknown Source)",
        "sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)",
        "java.lang.reflect.Method.invoke(Method.java:606)",
        "org.springframework.web.bind.annotation.support.HandlerMethodInvoker.invokeHandlerMethod(HandlerMethodInvoker.java:176)",
        "org.springframework.web.servlet.mvc.annotation.AnnotationMethodHandlerAdapter.invokeHandlerMethod(AnnotationMethodHandlerAdapter.java:436)",
        "org.springframework.web.servlet.mvc.annotation.AnnotationMethodHandlerAdapter.handle(AnnotationMethodHandlerAdapter.java:424)",
        "org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:923)",
        "org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:852)",
        "...snipped...",
        "java.lang.Thread.run(Thread.java:745)"
      ]);
    });
  });

  var monitor1 = {
    Class: "java.lang.Object@27c57a8d",
    IdentityHashCode: 12345,
    LockedStackDepth: 10,
    StackFrame: "sun.nio.ch.foo"
  };

  var monitor2 = {
    Class: "java.lang.String@27c57a8d",
    IdentityHashCode: 123,
    LockedStackDepth: 3,
    StackFrame: "sun.nio.ch.bar"
  };

  var threadData1 = {
    Id: 1,
    Name: 'Thread1',
    State: 'BLOCKED',
    "Lock Monitor Info": {
      "Locked Monitors": [monitor1],
      "Locked Synchronizers": []
    },
    'Stack Trace': stackTrace
  };

  var threadData2 = {
    Id: 2,
    Name: 'Thread2',
    State: 'BLOCKED',
    "Lock Info": {
      "Locked On": {
        Class: "java.lang.Object@27c57a8d",
        IdentityHashCode: 12345
      },
      "Lock Owner Thread Id": null,
      "Lock Owner Thread Name": null
    },
    'Stack Trace': ['foo', 'bar']
  };

  var threadData3 = {
    Id: 3,
    Name: 'Thread3',
    State: 'BLOCKED',
    "Lock Monitor Info": {
      "Locked Monitors": [monitor2],
      "Locked Synchronizers": []
    },
    'Stack Trace': stackTrace
  };

  var threadsData = {
    1: threadData1,
    2: threadData2,
    3: threadData3
  };

  it('should parse threads from JSON', function () {
    var threads = new Threads(threadsData);
    expect(threads.size()).toBe(3);
    expect(threads.threadIds()).toEqual([1, 2, 3]);
  });

  it('should find multiple threads with same stacktrace', function () {
    var threads = new Threads(threadsData);
    var groupedThreads = threads.groupByStackTrace();

    expect(groupedThreads.length).toBe(2);
    expect(_.map(groupedThreads, function (group) {
      return group.key()
    })).toContain(stackTrace);
    expect(_.map(groupedThreads, function (group) {
      return group.key()
    })).toContain(['foo', 'bar']);
  });

  it('should find all the lockedMonitors from all threads', function () {
    var threads = new Threads(threadsData);
    var lockedMonitors = threads.lockedMonitors();
    expect(lockedMonitors.length).toBe(2);
    expect(_.map(lockedMonitors, function (group) {
      return group.key()
    })).toContain(monitor1);
    expect(_.map(lockedMonitors, function (group) {
      return group.key()
    })).toContain(monitor2);
  });

  it('should find all the threads waiting on the provided lockedMonitor', function () {
    var threads = new Threads(threadsData);
    var waitingThreads = threads.threadsWaitingOn(monitor1);
    expect(waitingThreads.length).toBe(1);
    expect(waitingThreads[0].id()).toEqual(new Thread(threadData2).id()); //checking for same thread
  });

  it('should find all the threads holding on the provided lockedMonitor', function () {
    var threads = new Threads(threadsData);
    var waitingThreads = threads.threadsHoldingOn(monitor2);
    expect(waitingThreads.length).toBe(1);
    expect(waitingThreads[0].id()).toEqual(new Thread(threadData3).id()); //checking for same thread
  })

  it('should find all the unique locks', function(){
    var threads = new Threads(threadsData);
    var knownLocks = threads.knownLocks();
    expect(knownLocks.length).toBe(2);
    expect(knownLocks).toContain(monitor1);
    expect(knownLocks).toContain(monitor2);
  });
});
