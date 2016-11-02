/* USER LISTINGS */
var userList = [];

/* DOM READY */
$(document).ready(function() {
    
    // Populate the user table on page load
    populateTable();
 
});
    
/* FUNCTIONS */

// populateTable()
// *** Fill the table with actual data **/
function populateTable() {
    var tableContent = '';
    
    $.getJSON( '/users/userlist', function( data ) {
        $.each(data, function() {
           tableContent += '<tr><td><a href="#" class="linkShowUser" rel"' + this.username + '">' + this.username + '</a></td>';
           tableContent += '<td>' + this.email + '</td>';
           tableContent += '<td><a href="#" class="linkdeleteuser" rel="' + this._id + '">Delete?</a></td></tr>';
           console.log("boop");
        });
        
        //inject the table content
        $('#userList table tbody').html(tableContent);
    });
}