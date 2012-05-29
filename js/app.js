/**
 * Created with JetBrains WebStorm.
 * User: mbikt
 * Date: 5/29/12
 * Time: 5:13 PM
 * To change this template use File | Settings | File Templates.
 */


var app = function() {
  /* No jQuery syntax is being used below so that there's no confusion around what's unique to StackMob's JS SDK syntax*/

  /* This runs when you click on the "Create User" button */
  function create() {
    //Get the username from the form field
    var username = document.getElementById('username').value;

    //If the username isn't empty
    if (username != '') {

      //prepare the user as JSON
      var userjson = {
        'username': username,
        'password': 'afakepassword',
        'age': 30, //add on any custom fields you like
        'title': 'developer'
      };


      /* #########################################
       * START STACKMOB JS CODE
       * ######################################### */

      //Create a local instance of your User object.  StackMob gives you a User object out of the box.
      //Pass your JSON into the User constructor

      var user = new StackMob.User(userjson);

      //This makes an AJAX call telling StackMob's servers to save this user on the server side
      //StackMob will add new columns to your schema if they don't exist yet.  E.g., age, title..
      // check this one
      user.create(callbacks());

      /* #########################################
       * END STACKMOB JS CODE
       * ######################################### */


    }}

  /* This runs when you click on the "Fetch User" button */
  function read() {
    //Get the username from the form field
    var username = document.getElementById('username').value;

    //if the username isn't empty
    if (username != '') {






      /* #########################################
       * START STACKMOB JS CODE
       * ######################################### */

      //Call StackMob via Ajax to fetch a user by defining the username you want
      var fetchuser = new StackMob.User({ 'username': username });
      fetchuser.fetch(callbacks());


      /* #########################################
       * END STACKMOB JS CODE
       * ######################################### */



    }

  }

  /* Create, Fetch, and almost all other StackMob JS SDK methods have callbacks:  success/error.
   These will run when a response is heard back from the StackMob Servers.

   e.g

   //Example of callbacks
   var user = new StackMob.User({ username: 'chucknorris' });
   user.fetch({
   success: function(model) {
   //do something when there's a success
   },
   error: function(model, response) {
   //do something when there's an error
   }
   });


   */
  function callbacks() {

    var callback = {
      success: function(model) {
        console.debug("Received a success from StackMob!");
        if (model) {
          if (model.toJSON) console.debug(model.toJSON());
          var jf = new JSONFormatter((model.toJSON ? model.toJSON() : result), 'pre');
          $('#results').text(jf.formatJSON());
        } else $('#results').text('No response body. Check your Firebug/Developer Tools Javascript Console.');
      },
      error: function(model, response) {
        console.debug('There was an error returned by StackMob!');
        if (response) {
          var jf = new JSONFormatter(response, 'pre');
          $('#results').text(jf.formatJSON());
        } else $('#results').text('No response body. Check your Firebug/Developer Tools Javascript Console.');
      }
    };

    return callback;
  }

}();
