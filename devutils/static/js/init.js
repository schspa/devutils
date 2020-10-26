function update_reg_list() {
    $.ajax({
        url: '/static/xml/SysReg_xml_v86A-2019-12/AArch64-regindex.xml',
        //url: '/static/xml/test.xml',
        type: "GET",
        error: function (request, status, error) {
            console.log("An error occurred while processing XML file: ", request.responseText);
            console.log("XML reading failed: ", error);
        },
        success: function(response) {
            console.log("get xml data successfully");
            var list = $('#regs-table');
            $(response)
            // and search for all <field> elements
                .find('register_link')
            // now we can play with each <field>
                .each(function(index, element){
                    // as example we query & store the field
                    var field = $(element);
                    // get the values we want
                    var label = field.text();
                    var id = field.attr('id');
                    // and append some html in the <dl> element we stored previously
                    list
                        .append('<tr> <th scope="row">' + id + '</th> <td>' + label+': </td> </tr>')
                    ;
                })
            ;

            console.log('done');
        }
    })
}

$(document).ready(function (){
    update_reg_list();
})


