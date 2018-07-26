(function(win) {
    var DOCUMENT_STORE_NAME = "document-store";

    function makeUUID() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }

    function makeRevID(revNum) {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (revNum ? revNum : 1) + "-" + S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4();
    }

    function is(type) {
        return function(o) {
            return Object.prototype.toString.call(o) === '[object ' + type + ']';
        }
    }

    function docIdExists(doc) {
        if (is("Array")(doc)) {
            for (var i in doc) {
                if (doc[i].id === (void 0)) {
                    return false;
                }
            }
            return true;
        } else {
            return doc.id !== (void 0);
        }
    }

    function _Error(message) {
        this.name = '_Error';
        this.message = message || 'error';
        this.stack = (new Error()).stack;
    }
    _Error.prototype = Object.create(Error.prototype);
    _Error.prototype.constructor = _Error;

    function initDB(_indexedDB, name) {
        var request = _indexedDB.open(name);
        request.onerror = function(event) {
            console.error("open indexDB error");
            console.log(event);
        };
        request.onsuccess = function(event) {
            parent.db = event.target.result;
            console.log("dbinit onsuccess");
        };
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var objectStore = db.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: "id" });
            objectStore.createIndex("id", "id", { unique: true });
            console.log("create db success");
        };
    }

    function MyIndexDB(name, options) {
        this.name = name;
        this.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
        if (!indexedDB) {
            console.log("你的浏览器不支持IndexedDB");
            return;
        }
        this.version = 1;
        initDB(this.indexedDB, name);
    }
    // 数据库连接
    MyIndexDB.prototype.connectDB = function(callback) {
        var request = this.indexedDB.open(this.name);
        request.onerror = function(event) {
            console.error("open db error");
            callback(event);
        };
        request.onsuccess = function(event) {
            console.log("open db success");
            callback(null, event.target.result);
        };
    }
    // 数据放入，id的键值必填
    MyIndexDB.prototype.put = function(doc, callback) {
        this.connectDB(function(err, db) {
            if (!err) {
                if (docIdExists(doc)) {
                    var result = [];
                    var isArray = is("Array")(doc);
                    var transaction = db.transaction([DOCUMENT_STORE_NAME], "readwrite");
                    transaction.oncomplete = function(event) {
                        if (isArray) {
                            callback(null, result);
                        }
                    };
                    transaction.onabort = function(event) {
                        console.error(event.target.error);
                        callback(new _Error(event.target.error));
                    }
                    var objectStore = transaction.objectStore(DOCUMENT_STORE_NAME);
                    if (isArray) {
                        for (var i in doc) {
                            (function(j) {
                                var request = objectStore.put(doc[j]);
                                request.onsuccess = function(event) {
                                    result[j] = event.target.result;
                                };
                            })(i);
                        }
                    } else {
                        var request = objectStore.put(doc);
                        request.onsuccess = function(event) {
                            callback(null, event.target.result);
                        };
                    }
                } else {
                    var err = new Error("Evaluating the object store's key path 'id' did not yield a value");
                    console.error(err.message);
                    callback(err);
                    return;
                }
            }
        });
    }
    // 数据放入，id的键值随机生成
    MyIndexDB.prototype.post = function(doc, callback) {
        if (is("Array")(doc)) {
            for (var i in doc) {
                if (is("Object")(doc[i]) && doc[i].id === void 0) {
                    doc[i].id = makeUUID();
                }
            }
        } else {
            if (is("Object")(doc) && doc.id === void 0) {
                doc.id = makeUUID();
            }
        }
        this.put(doc, callback);
    }
    // 根据id值查询数据
    MyIndexDB.prototype.get = function(docId, callback) {
        this.connectDB(function(err, db) {
            if (!err) {
                db.onerror = function(event) {
                    console.error(event.target.error);
                    callback(new _Error(event.target.error));
                }
                var result = [];
                var isArray = is("Array")(docId);
                var transaction = db.transaction([DOCUMENT_STORE_NAME]);
                transaction.oncomplete = function(event) {
                    if (isArray) {
                        callback(null, result);
                    }
                }
                var objectStore = transaction.objectStore(DOCUMENT_STORE_NAME);
                if (isArray) {
                    for (var i in docId) {
                        (function(j) {
                            var request = objectStore.get(docId[j]);
                            request.onsuccess = function(event) {
                                result[j] = event.target.result;
                            };
                        })(i);
                    }
                } else {
                    var request = objectStore.get(docId);
                    request.onsuccess = function(event) {
                        callback(null, event.target.result)
                    };
                }
            }
        });
    }
    // 根据id删除数据
    MyIndexDB.prototype.remove = function(docId, callback) {
        this.connectDB(function(err, db) {
            var transaction = db.transaction([DOCUMENT_STORE_NAME], "readwrite")
            var objectStore = transaction.objectStore(DOCUMENT_STORE_NAME);
            transaction.oncomplete = function(event) {
                callback(null, event.target.result);
            };
            transaction.onabort = function(event) {
                console.error(event.target.error);
                callback(new _Error(event.target.error));
            }
            if (is("String")(docId)) {
                objectStore.delete(docId);
            } else if (is("Array")(docId)) {
                for (var i in docId) {
                    objectStore.delete(docId[i]);
                }
            }
        });
    }
    win.MyIndexDB = MyIndexDB;
})(window);

// var indexdb = new MyIndexDB("indexdb_test");

// indexdb.put([{id:"doc1",title:"doc_content_1"},{id:"doc2",title:"doc_content_2"}],function(err, id){
// 	if(!err){
// 		console.log(id);
// 	}else{
// 		console.log(err);
// 	}
// });
// indexdb.post([{title:"doc_content_3"},{title:"doc_content_4"}],function(err, id){
// 	if(!err){
// 		console.log(id);
// 	}else{
// 		console.log(err);
// 	}
// });
// indexdb.get(["doc1","doc2"],function(err, result){
// 	if(!err){
// 		console.log(result);
// 	}else{
// 		console.log(err);
// 	}
// });

// indexdb.remove(["doc1","doc2"],{},function(err, result){
// 	if(!err){
// 		console.log(result);
// 	}else{
// 		console.log("delete error")
// 		console.log(err);
// 	}
// });