function update_reg_list() {
    var regtype = $('#regtype').val();
    var url;
    if (regtype == "AARCH64") {
        reg_xml_url = '/static/xml/SysReg_xml_v86A-2019-12/AArch64-regindex.xml';
    } else {
        reg_xml_url = '/static/xml/SysReg_xml_v86A-2019-12/AArch32-regindex.xml';
    }
    $.ajax({
        url: reg_xml_url,
        //url: '/static/xml/test.xml',
        type: "GET",
        error: function (request, status, error) {
            console.log("An error occurred while processing XML file: ", request.responseText);
            console.log("XML reading failed: ", error);
        },
        success: function(response) {
            var regnames = new Array(0);
            console.log("get xml data successfully");
            var list = $('#regs-table');
            list.empty();
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
                    regnames.push(id);
                    // and append some html in the <dl> element we stored previously
                    list
                        .append('<tr> <th scope="row">' + id + '</th> <td>' + label+': </td> </tr>')
                    ;
                })
            ;
            // Constructing the suggestion engine
            var regnames = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: regnames
            });

            // Initializing the typeahead
            $('#regname').typeahead({
                hint: true,
                highlight: true, /* Enable substring highlighting */
                minLength: 1 /* Specify minimum characters required for showing result */
            },
                                    {
                                        name: 'regnames',
                                        source: regnames
                                    });


            console.log('done');
        }
    })
}

$(document).ready(function () {
    update_reg_list();
})


