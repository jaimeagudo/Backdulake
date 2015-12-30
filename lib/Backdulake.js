import _ from 'underscore';
import amanda from 'amanda';

class Backdulake {

  /*
   * The constructor of your store definition receives the alt instance as its first and only argument. All instance variables,
   * values assigned to `this`, in any part of the StoreModel will become part of state.
   */
  constructor() {
    // Instance variables defined anywhere in the store will become the state. You can initialize these in the constructor and
    // then update them directly in the prototype methods
    //    this.model = Immutable.OrderedMap({});
    // Do not think we need an Immutable object here

    //Stores the id of the selected model while we fetch from the DB
    this.id=null;
    this.parentId = null;
    //Represents the current Model, if its new the id will be null. As soon as the
    this.model = null;
    //TO BE overriden
    this.defaultModel={};


    this.__jsonSchemaValidator = amanda('json');

    //TO BE overriden
    //JSON schema intended to be used with Amanda
    this.modelSchema={
      type: "object",
      properties: {
        "id": {
          required: false,
          type: 'number'
        }
      }
    };


    //Backdulake.model
    //---------
    //Represents the collection of all the models belonging to the parentId
    this.collection = [];
    this.loading = false;
    this.errorMessage = null;

    //TO BE overriden
    //Aliases of model atrributes for nicer error messages
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



  //Declared static to be Public method on alt
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
  handleCreate(){
    this.loading=false;
    this.model=this.defaultModel;
    this.emitChange();
  }


  handleSaved(response) {
    this.loading=false;
    //Grab the id, TO update the model
    if(response.data.id){
      this.model.id=response.data.id;
    }
    //Its already on the server, push in to the collection
    this.collection.push(model);
    this.emitChange();
  }


  //Don't update the collection till we get the server ACK
  handleSave(model) {
    this.loading=true;
    this.model=model;
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
        m.id == model.id;
    });

    if(model.id == this.model.id){
      this.id=null;
      this.model=null;
    }
  }


  handleFailed(data) {
    this.loading=false;
  }

}

// Export our newly created Store
module.exports= Backdulake;
