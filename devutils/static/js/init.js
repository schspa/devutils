var register_map = new Object();

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
                    register_map[id] = $(element).attr('registerfile')
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

function goto_regs_desc() {
    var regtype = $('#regtype').val();
    var regname = $('#regname').val();
    var regval  = parseInt($('#regvalue').val());
    var regfile = "/static/xml/SysReg_xml_v86A-2019-12/" + register_map[regname]
    console.log(regfile)
    console.log("regtype:" + regtype + " regname:" + regname + " val:" + regval);

    $.ajax({
        url: regfile,
        type: "GET",
        error: function (request, status, error) {
            console.log("An error occurred while processing XML file: ", request.responseText);
            console.log("XML reading failed: ", error);
        },
        success: function(response) {
            $('#current_reg_name').text(regname);
            $('#current_reg_name').attr('href', regfile);
            var filedescs = $('#regs-field-descs');
            filedescs.empty();
            $('register_page > registers > register > reg_fieldsets > reg_fieldset',response)
                .find('fieldat') /* arm use this element to get reg filed maps */
                .each(function(index, element){
                    // as example we query & store the field
                    var id = $(element).attr('id');
                    var msb = parseInt($(element).attr('msb'))
                    var lsb = parseInt($(element).attr('lsb'))

                    var field = $('#'+id, response);
                    rwtype=$(field).attr('rwtype');
                    if (rwtype != undefined) {
                        field = rwtype;
                    } else {
                        field = $(field).children('field_name').text();
                    }
                    var value = regval >> lsb;
                    value &= (1 << (msb - lsb + 1)) - 1;
                    // TODO: fix href link
                    filedescs.append('<tr><th>'+ msb +':' + lsb + '</th><th>' + field + '</th> <th><a target="_blank" href="' + regfile + '#' + id + '">' + value.toString(2) + '</a></th></tr>');
                });
        }});
}

$(document).ready(function () {
    update_reg_list();
})


