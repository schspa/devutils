var register_map = new Object();
var regtypes = new Array(0);

function parse_reg_xml(reg) {
    $.ajax({
        url: reg['path'],
        type: "GET",
        error: function (request, status, error) {
            console.log("An error occurred while processing XML file: ", request.responseText);
            console.log("XML reading failed: ", error);
        },
        success: function(response) {
            var regnames = new Array(0);
            console.log("get reg xml data successfully");
            var list = $('#regs-table');
            list.empty();
            $(response)
                .find('register_link')
                .each(function(index, element){
                    var field = $(element);
                    var label = field.text();
                    var id = field.attr('id');
                    register_map[id] = reg['basepath'] + '/' + $(element).attr('registerfile')
                    regnames.push(id);
                    list.append('<tr> <th scope="row">' + id + '</th> <td>' + label+': </td> </tr>');
                });
            // Constructing the suggestion engine
            var regnames = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: regnames
            });

            // Initializing the typeahead
            $('#regname').typeahead(
                {
                    hint: true,
                    highlight: true, /* Enable substring highlighting */
                    minLength: 1 /* Specify minimum characters required for showing result */
                },
                {
                    name: 'regnames',
                    source: regnames
                });
        }
    })
}

function init_reg_list() {
    var regtype = $('#regtype').val();
    var url;
    $.ajax({
        url: '/static/arm-asl/asl.xml',
        type: "GET",
        error: function (request, status, error) {
            console.log("An error occurred while request asl xml file: ", request.responseText);
            console.log("XML reading failed: ", error);
        },
        success: function(response) {
            $(response)
                .find('regtype')
                .each(function (index, element) {
                    var regtype_ele = $(element);
                    var type = regtype_ele.attr('type');
                    var regs = [];
                    regtype_ele
                        .find('reg')
                        .each(function (idx, reg_ele) {
                            regs.push({
                                'name' : $('name', $(reg_ele)).text(),
                                'path' : $('path', $(reg_ele)).text(),
                                'basepath' : $('basepath', $(reg_ele)).text(),
                            })
                        })
                    regtypes.push({
                        'type' : type,
                        'regs' : regs,
                    });
                })
            parse_reg_xml(regtypes[0]['regs'][0])
        }
    })
}

function update_reg_list() {
    var type = $('#regtype').val();
    var url;

    var regtype = regtypes.find(function (a) {
        return a['type'].toUpperCase() === type.toUpperCase();
    });

    if (regtype == undefined)
        console.log('failed to find type: ', type);


    parse_reg_xml(regtype['regs'][0])
}

function get_val_string(val, width, base) {
    var base_width;

    /* TODO: use correct way to calculate string length. */
    if (base == 2) {
        base_width = width;
    } else {
        base_width = Math.ceil(width/4);
    }

    if (base == 10) {
        return ("0".repeat(base_width) + (val|0).toString(base)).substr(-base_width);
    }

    return ("0".repeat(base_width) + ((val|0)+4294967296).toString(base)).substr(-base_width);
}

function goto_regs_desc() {
    var regtype = $('#regtype').val();
    var regname = $('#regname').val();
    var regval  = parseInt($('#regvalue').val());
    var regfile = register_map[regname];
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
            var fieldbody = $('#regfield_body');
            fieldbody.empty();
            regfields = new Array();
            $('register_page > registers > register > reg_fieldsets > reg_fieldset',response)
                .find('fieldat') /* arm use this element to get reg filed maps */
                .each(function(index, element){
                    // as example we query & store the field
                    var id = $(element).attr('id');
                    var msb = parseInt($(element).attr('msb'))
                    var lsb = parseInt($(element).attr('lsb'))
                    var width = msb - lsb + 1;

                    var field = $('#'+id + ':first', response);
                    rwtype=$(field).attr('rwtype');
                    if (rwtype != undefined) {
                        field = rwtype;
                    } else {
                        field = $('field_name:first', field).text();
                    }
                    regfields.push({'id': id, 'msb': msb, 'lsb': lsb, 'width': width, 'name': field});

                    var value = regval >> lsb;
                    value &= (1 << width) - 1;
                    console.log("get value", id, value, msb, lsb, width);
                    var binvalue = get_val_string(value, width, 2);
                    var hexvalue = get_val_string(value, width, 16);
                    var decvalue = get_val_string(value, width, 10);

                    filedescs.append('<tr><th>'+ msb +':' + lsb + '</th><th>' + field + '</th> <td><a class="binval" target="_blank" href="' + regfile + '#' + id + '">' + binvalue + '</a><div class="hexvalue">' + hexvalue + '</div><div class="decvalue">' + decvalue + '</div></td></tr>');
                });
            regfields.sort(function(a, b){return b['msb'] - a['msb']});
            result = '';
            regfields.forEach(function(reg) {
                if ((reg['msb'] + 1) % 32 == 0) {
                    result += '<tr class="firstrow">';
                }

                result += '<td class = "lr" colspan="'+ reg['width'] + '">' + '<a class="binval" target="_blank" href="' + regfile + '#' + reg['id'] + '">' + reg['name'] + '</a>' + '</td>';

                if (reg['lsb'] % 32 == 0) {
                    result += '</tr>';
                }
            });
            fieldbody.append(result);
        }});
}

$(document).ready(function () {
    init_reg_list();
})
