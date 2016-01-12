import _ from 'underscore';
import amanda from 'amanda';

class Backdulake {

  /*
   * The constructor of your store definition receives the alt instance as its first and only argument. All instance variables,
   * values assigned to `this`, in any part of the StoreModel will become part of state.
   */
  constructor() {
    // Instance variables defined anywhere in the store will become the state.
    this.handleReset();

    this.__jsonSchemaValidator = amanda('json');


    //JSON schema intended to be used with Amanda
    //TO BE overriden
    this.modelSchema={
      type: "object",
      properties: {
        "id": {
          required: false,
          type: 'number'
        }
      }
    };



    //Aliases of model atrributes for nicer error messages
    //TO BE overriden
    this.aliases={};
    //Sample:

    // this.aliases={
    //   pc: "Postal Code",
    //   vat: "VAT Registration Number",
    // };

    this.publicMethods={
      find: this.find.bind(this),
      validate: this.validate.bind(this)
    };

    // (lifecycleMethod: string, handler: function): undefined
    // on: This method can be used to listen to Lifecycle events. Normally they would set up in the constructor
  }


  find(id){
    var collection = this.collection || this.getState().collection;

    return _.find(collection, function(item){
      return item.id == id;
    });
  }


  //Declared static to be Public method on alt
  validate(model, jsonSchema){

    if(!model){
      console.console.warn("Backdulake.validate() needs a model argument, it doesn't take this model by default");
      return;
    }

    jsonSchema = jsonSchema || this.modelSchema;
    // Validate the attributes against the schema.
    var that=this;
    this.__jsonSchemaValidator.validate(model, jsonSchema, this.__validationOptions(this.aliases), function(error) {
      that.errorMessage=error;
    });

    //Returns the error object if any
    if(that.errorMessage) return that.errorMessage;
  }


  __validationOptions(aliases, getMessages) {

    //Keep the aliases on the closure
    var fieldAlias= function(s){
      return aliases && aliases[s] || s;
    }

    var defaultMessages={
      required: function(property, value, attributeValue) {
        return fieldAlias(property) + ' is required.';
      },
      minLength: function(property, propertyValue, attributeValue) {
        return fieldAlias(property) + ' must be at least ' + attributeValue + ' characters long.';
      },
      maxLength: function(property, propertyValue, attributeValue) {
        return fieldAlias(property) + ' must be no longer than ' + attributeValue + ' characters.';
      },
      length: function(property, propertyValue, attributeValue) {
        return fieldAlias(property) + ' must be exactly ' + attributeValue + ' characters long.';
      }
    }

    return {
      singleError: false,
      //Nicer error messages
      messages: getMessages && getMessages(aliases) || defaultMessages
    };
  }

  //To reset the all store data but aliases & modelSchema
  handleReset(){
    this.parentId = null;

    //Represents the collection of all the models belonging to the parentId
    this.collection = [];

    //Backdulake.model
    //---------
    //TO BE overriden
    //Take default values for the new model
    //Intended to be a house of objects with sane default values rather
    //than spreading them into components default properties
    this.defaultModel={};

    //Stores the id of the selected model while we fetch from the DB
    this.id=null;
    //Represents the current Model, if its new the id will be null.
    this.model = null;

    this.loading = false;
    this.errorMessage = null;
  }

  //up to the client to call validate before saving or not!
  //Move into the action?
  handleValidateAndSave(model){
    this.loading=true;
    if(model){
      console.log("Validating external model at " + this.displayName + ": "  + model );
    }

    this.errorMessage=this.__validate(model, this.modelSchema, this.aliases);
    model=model || this.model;
  }

  //Take default values for the new model
  //Intended to be a house of objects with sane default values rather
  //than spreading them into components default properties
  handleCreate(){
    this.loading=false;
    this.model=this.defaultModel;
    this.emitChange();
  }

  //Don't update the collection till we get the server ACK
  //Intended to be used for creation & update
  handleSave(model) {
    this.loading=true;
    this.model=model;
    if(model.id)
      this.id=model.id
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

    if( ! response.id ){
      console.error("Backdulake.handleSaved: No id present on the response, changes NOT persisted on the store");
      return;
    }

    if( ! this.id || _.isEmpty(this.model) ){
      console.warn("Backdulake.handleSaved: The model prior to the server response is empty. Will continue assumming the Server response will provide it!");
    } else if (this.id != response.id ){
      console.warn("Backdulake.handleSaved: The id from the response + (" + id + ") doesn't match the current model one (" + this.model.id  + "). You might forgot to bind Backdulake.handleSave");
    }

    //Find it if it exists
    let index=_.findIndex(this.collection, function(m){
      return m.id == response.id;
    });

    //Update the existing model
    if(index > -1){
      this.collection[index]=response;
    //Add the new model
    } else{
      this.collection.push(response);
    }

    this.id=response.id;
    this.model=response;
    this.emitChange();
  }



  //Set the id. If the collection hasn't been populated from the server
  //the model will be selected based on this id as soon as it gets populated
  handleEdit(id){
    this.loading=true;
    this.id=id;
    this.model=this.find(id);
  }

  //Set the parent's modelId
  handleFetch(parentId) {
    this.loading=true;
    this.parentId=parentId;
  }


  handleFetched(models) {
    this.loading=false;
    this.collection=models;
    //Set the model as soon as the collection gets populated
    if(this.id)
      this.model=this.find(this.id);

    this.emitChange();
  }


  handleRemove(model) {
    this.loading=true;
  }

  handleRemoved(model) {
    this.loading=false;
    this.collection=_.reject(this.collection, function(m){
        return m.id == model.id;
    });

    if(model.id == this.model.id){
      this.id=null;
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
