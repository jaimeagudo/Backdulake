import _ from 'underscore';
import amanda from 'amanda';
var Immutable = require('immutable');

class Backdulake {

  /*
   * The constructor of your store definition receives the alt instance as its first and only argument. All instance variables,
   * values assigned to `this`, in any part of the StoreModel will become part of state.
   */
  constructor() {
    // Instance variables defined anywhere in the store will become the state.
    this.handleReset();

    this.__jsonSchemaValidator = amanda('json');

    this.idAttribute="id";

    //JSON schema intended to be used with Amanda
    //TO BE overriden
    this.jsonSchema={
      type: "object",
      properties: {
        "id": {
          required: false,
          type: "number"
        }
      }
    };

    //Ala backbone id attribute


    //Aliases of model atrributes for nicer error messages
    //TO BE overriden
    this.aliases={};
    //Sample:

    // this.aliases={
    //   pc: "Postal Code",
    //   vat: "VAT Registration Number",
    // };


    //Extender classes will have to use this.exportPublicMethods() function to add extra methods while keeping these ones
    this.publicMethods={
      find: this.find.bind(this),
      validate: this.validate.bind(this)
    };

    // (lifecycleMethod: string, handler: function): undefined
    // on: This method can be used to listen to Lifecycle events. Normally they would set up in the constructor
  }

  getImmutableState() {
    //return new Immutable.Record(this);
    let ObjectRecord = Immutable.Record(this);
    return new ObjectRecord();
  }


  find(id){
    var collection = this.collection || this.getState().collection;

    return _.find(collection, function(item){
      return item[this.idAttribute] == id;
    },this);
  }


  //Declared static to be Public method on alt
  validate(model, jsonSchema){

    if(!model){
      console.console.warn("`Backdulake.validate()` needs a model argument, it doesn't take `this.model` by default");
      return;
    }

    jsonSchema = jsonSchema || this.jsonSchema;
    // Validate the attributes against the schema.
    var that=this;
    this.__jsonSchemaValidator.validate(model, jsonSchema, this.__validationOptions(this.aliases), function(e) {
      that.errors=e;
    });

    //Returns the error object if any
    if(this.errors) return this.errors;
  }


  __validationOptions(aliases, getMessages) {

    //Keep the aliases on the closure
    var vowels = "aeiou";

    var fieldAlias= function(s){
      if(Array.isArray(s))
        return _.map(s,function(e){
          return aliases && aliases[e] || e;
        }).join(' ');

      return aliases && aliases[s] || s;
    }

    var defaultMessages={
      required: function(property, value, attributeValue) {
        return '‘'+ fieldAlias(property) + '’ is required.';
      },
      number: function(property, value, attributeValue) {
        return '‘'+ fieldAlias(property) + '’ has to be valid number.';
      },
      minLength: function(property, propertyValue, attributeValue) {
        return '‘'+ fieldAlias(property) + '’ must be at least ' + attributeValue + ' characters long.';
      },
      maxLength: function(property, propertyValue, attributeValue) {
        return '‘'+ fieldAlias(property) + '’ must be no longer than ' + attributeValue + ' characters.';
      },
      length: function(property, propertyValue, attributeValue) {
        return '‘'+  fieldAlias(property) + '’ must be exactly ' + attributeValue + ' characters long.';
      },
      pattern: function(property, propertyValue, attributeValue) {
        return 'Well, ‘' + fieldAlias(property) + '’ doesn\'t look like to have the right format. ';
      },
      format: function(property, propertyValue, attributeValue) {
        return 'Well, ‘' + fieldAlias(property) + '’ doesn\'t look like to have the right format. ';
      },
      type: function(property, propertyValue, attributeValue) {
        return '‘' + fieldAlias(property) + '’ must be ' + (vowels.indexOf(attributeValue[0]) > -1 ? 'an' : 'a') + ' valid ‘' + attributeValue + '’.';
      }
    };


    return {
      singleError: false,
      //Nicer error messages
      messages: getMessages && getMessages(aliases) || defaultMessages
    };
  }

  //To reset the all store data but aliases & jsonSchema
  handleReset(){

    //Stores the id of the selected model while we wait for asynch responses from the server
    this[this.idAttribute]=null;

    //Represents the collection of all the models belonging to the
    this.collection = [];


    //TO BE overriden

    //Intended to be a house of objects with sane default values rather
    //than spreading them into components default properties
  //  this.defaultModel={};

    //Backdulake.model
    //---------
    //Represents the current Model, if its new the id will be null.
    this.model = null;
    //True if we are waiting for an asynch response from the server
    this.loading = false;
    this.errors = null;
  }

  //up to the client to call validate before saving or not!
  //Move into the action?
  handleValidateAndSave(model){
    this.loading=true;
    // if(model){
    //   console.log("Validating external model at " + this.displayName + ": "  + model );
    // }

    this.errors=this.__validate(model, this.jsonSchema, this.aliases);
    model=model || this.model;
  }

  //Take default values for the new model
  //Intended to be a house of objects with sane default values rather
  //than spreading them into components default properties
  handleCreate(){
    this.loading=false;
    this.model=this.defaultModel;
    this[this.idAttribute]=null;
    this.emitChange();
  }

  //Don't update the collection till we get the server ACK
  //Intended to be used for creation & update
  handleSave(model) {
    this.loading=true;
    this.model=model;
    if(model[this.idAttribute])
      this[this.idAttribute]=model[this.idAttribute]
  }

  handleSaved(response) {
    this.loading=false;

    //Unwrap data just in case
    response=response.data || response;

    //Check for typical setup errors
    if( _.isEmpty(response) ){
      console.error("Backdulake.handleSaved: the response is empty!");
      return;
    }

    if( ! response[this.idAttribute] ){
      console.error("Backdulake.handleSaved: No id present on the response, changes NOT persisted on the store");
      return;
    }

    if( _.isEmpty(this.model) ){
      console.warn("Backdulake.handleSaved: The model prior to the server response is empty. You might forgot to bind handleSave to the correspondant Action. Will continue assumming the Server response will provide it!");
      this.model=response;
    } else {
      _.extend(this.model,response);
    }
    if (this[this.idAttribute] && (this[this.idAttribute] != response[this.idAttribute]) ){
      console.warn("Backdulake.handleSaved: The id from the response + (" + response[this.idAttribute] + ") doesn't match the current model one (" + this.model[this.idAttribute]  + "). You might forgot to bind Backdulake.handleSave");
    }

    //Find it if it exists
    let index=_.findIndex(this.collection, function(m){
      return m[this.idAttribute] == response[this.idAttribute];
    },this);


    //Update the existing model
    if(index > -1){
      this.collection[index]=this.model;
    //Add the new model and the id
    } else{
//      this.model[this.idAttribute]=response[this.idAttribute];
      this[this.idAttribute]=response[this.idAttribute];
      this.collection.push(this.model);
    }

    this.emitChange();
  }



  //Set the id. If the collection hasn't been populated from the server
  //the model will be selected based on this id as soon as it gets populated
  handleEdit(id){
    this.loading=true;
    this[this.idAttribute]=id;
    this.model=this.find(id);
  }

  handleFetch(id) {
    this.loading=true;
    if(id)
      this[this.idAttribute]=id;
  }


  handleFetched(response) {

    if(response){
      //raw non-paginated collection
      if(Array.isArray(response)){
          this.collection=response
          this.total=this.collection.length;
          this.hasMore=false;

      } else if (typeof response == "object"){
        //paginated collection
        if(Array.isArray(response.collection)) {
          let concatenated=this.collection.concat(response.collection);
          //Even if we fetch twice the same page we won't get duplicates
          this.collection = _.uniq(concatenated, function(item, key, a) {
            return item[this.idAttribute];
          });
          this.total=response.total || this.total;
          this.hasMore=this.total > this.collection.length;
        //A single element fetched
        } else if(response[this.idAttribute]) {
          this.model=response;
        }
      }
    }
    this.loading=false;
    this.emitChange();
  }

  handleRemove(model) {
    this.loading=true;
  }

  handleRemoved(model) {
    this.loading=false;
    this.collection=_.reject(this.collection, function(m){
        return m[this.idAttribute] == model[this.idAttribute];
    },this);

    if(this.model && (model[this.idAttribute] == this.model[this.idAttribute])){
      this[this.idAttribute]=null;
      this.model=null;
    }
    this.emitChange();
  }


  handleFailed(data) {
    this.loading=false;
  }

}

// Export our newly created Store
module.exports= Backdulake;
