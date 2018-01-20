Entries = new Meteor.Collection('entries');

// loading the npm module
ElasticSearch = Meteor.npmRequire('elasticsearch');

// create the client
EsClientSource = new ElasticSearch.Client({
  host: 'localhost:9200'
});

// make it fiber aware
EsClient = Async.wrap(EsClientSource, ['index', 'search']);


Meteor.methods({
  addEntry: function(name, phoneNo) {
//    Entries.insert({name: name, phoneNo: phoneNo});
      var id = Entries.insert({name: name, phoneNo: phoneNo});

      // create a document Index Elastic Search
      EsClient.index({
      	index: "myindex",
      	type: "phonebook",
      	id: id,
        body: {
        	name: name,
        	phoneNo: phoneNo
        }
      });
  }
});

/* Uses Mongo DB for search
Meteor.methods({
  getEntries: function(searchText) {
    var regExp = new RegExp(searchText, 'i');
    return Entries.find({
      name: regExp
    }, {sort: {name: 1}, limit:20}).fetch();
  }
});
**/

Meteor.methods({
  getEntries: function(searchText) {
/** No partial Matching
    // the the result from Elastic Search
    var result =  EsClient.search({
      index: "myindex",
      type: "phonebook",
      body: {
        query: {
          match: {
            name: searchText
          }
        }
      }
    });
**/

    var lastWord = searchText.trim().split(" ").splice(-1)[0];
    var query = {
      "bool": {
        "must": [
          {
            "bool": {
              "should": [
                {"match": {"name": {"query": searchText}}},
                {"prefix": {"name": lastWord}}
              ]
            }
          }
        ],
        "should": [
          {"match_phrase_prefix": {"name": {"query": searchText, slop: 5}}}
        ]
      }
    };

    var result =  EsClient.search({
      index: "myindex",
      type: "phonebook",
      body: {
        query: query
      }
    });

    // pick actual set of data we need to send
    return result.hits.hits.map(function(doc) {
      return doc._source;
    });
  }
});


