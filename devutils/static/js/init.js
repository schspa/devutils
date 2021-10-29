var register_map = new Object();
var regtypes = new Array(0);

function parse_reg_xml(reg, callback) {
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
            callback();
        }
    })
}

function init_reg_list(callback) {
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
            parse_reg_xml(regtypes[0]['regs'][0], callback)
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
/**
 *
 * registers > register > reg_fieldsets
 * registers > register > reg_fieldsets > fields > field > partial_fieldset
 *  all node should contains subnode:
 *      fields
 *      reg_fieldset
 *
 */
function parse_fieldsets(reg, regval) {
    $('> reg_fieldset', reg).children('fieldat').each(function (index, element) {
        var id = $(element).attr('id');
        var msb = parseInt($(element).attr('msb'))
        var lsb = parseInt($(element).attr('lsb'))
        var width = msb - lsb + 1;

        var value = regval >> lsb;
        value &= (1 << width) - 1;

        var field = $('> fields > field#'+id, reg);
        var has_partial_fieldset = $(field).attr('has_partial_fieldset') === 'True';

        console.log("get value", id, value, msb, lsb, width, has_partial_fieldset);
        rwtype=$(field).attr('rwtype');
        var fieldname = undefined;
        if (rwtype != undefined) {
            fieldname = rwtype;
        } else {
            fieldname = $('field_name:first', field).text();
        }
        regfields.push({
            'id': id,
            'name': fieldname,
            'value': value,
            'msb': msb,
            'lsb': lsb,
            'width': width,
            'field': field,
            'is_partial' : has_partial_fieldset
        });
    });
}

function get_partial_fildsets(reg, regval, cond) {
    var partial_fieldset = undefined;

    reg.find('partial_fieldset').each(function(index, element) {
        instance = $('fields > fields_instance', element).text();
        if (instance === cond) {
            partial_fieldset = element;
        }
    });
    if (partial_fieldset == undefined) {
        console.log("Can't find Matching fields_instance");
        return;
    }

    parse_fieldsets(partial_fieldset, regval);
    console.log(partial_fieldset);
    return '';
}

function get_reg_filed(reg, regfile, regval) {
    regfields = new Array();
    fieldesc = '';
    var field_value_links = new Array();
    var partial_fieldsets = new Array();

    parse_fieldsets($('reg_fieldsets', reg), regval);

    regfields.forEach(function(regfield) {
        var field = regfield['field'];
        var fieldname = regfield['name'];
        var value = regfield['value'];
        var width = regfield['width'];
        var binvalue = get_val_string(value, width, 2);
        var hexvalue = get_val_string(value, width, 16);
        var decvalue = get_val_string(value, width, 10);

        if (regfield['is_partial']) {
            partial_fieldsets.push({'name' : fieldname, 'value' : value});
        }
        $(field).find('field_value_instance').each(function(idx, element) {
            links = $('field_value_links_to', $(element));

            var field_value = $('field_value', $(element)).text();
            if (field_value == undefined || field_value !== ('0b' + binvalue)) {
                return;
            }
            if (links == undefined || $(links).attr('linked_field_condition') == undefined) {
                return;
            }

            field_value_links.push(
                {
                    'linked_field_condition' : $(links).attr('linked_field_condition'),
                    'linked_field_name' : $(links).attr('linked_field_name'),
                    'value' : $('field_value', $(element)).text(),
                });
        });
    });
    console.log(partial_fieldsets);
    console.log(field_value_links);
    partial_fieldsets.forEach(function (ele, index) {
        regfield = regfields.find(function (regfield) {
            return regfield['name'] === ele['name'];
        });
        if (regfield == undefined) {
            return;
        }

        cond = field_value_links.find(function (ele) {
            return ele['linked_field_name'] == regfield['name'];
        });
        if (cond == undefined) {
            return;
        }

        get_partial_fildsets(
            $('reg_fieldsets > fields > field#'+regfield['id'], reg),
            ele['value'],
            cond['linked_field_condition']);
    });

    console.log('regfields: ', regfields);

    regfields = regfields.filter(function(ele) {
        return (ele['is_partial'] == undefined || !ele['is_partial'])
    });
    regfields.sort(function(a, b){return b['msb'] - a['msb']});
    fieldbody = '';
    regfields.forEach(function(reg) {
        var value = reg['value'];
        var width = reg['width'];
        var binvalue = get_val_string(value, width, 2);
        var hexvalue = get_val_string(value, width, 16);
        var decvalue = get_val_string(value, width, 10);

        if ((reg['msb'] + 1) % 32 == 0) {
            fieldbody += '<tr class="firstrow">';
        }

        fieldbody += '<td class = "lr" colspan="'+ reg['width'] + '">' + '<a class="binval" target="_blank" href="' + regfile + '#' + reg['id'] + '">' + reg['name'] + '</a>' + '</td>';

        if (reg['lsb'] % 32 == 0) {
            fieldbody += '</tr>';
        }

        fieldesc += '<tr><th>'+ reg['msb'] +':' + reg['lsb'] + '</th><th>' + reg['name'] + '</th> <td><a class="binval" target="_blank" href="' + regfile + '#' + reg['id'] + '">' + binvalue + '</a><div class="hexvalue">' + hexvalue + '</div><div class="decvalue">' + decvalue + '</div></td></tr>';
    });

    return {
        'fieldbody' : fieldbody,
        'fieldesc' : fieldesc,
    };
}

function goto_regs_desc() {
    var regtype = $('#regtype').val();
    var regname = $('#regname').val();
    /* TODO: switch to long.js or something else, to provide 64bit support */
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
            $('#current_reg_name').attr('href', regfile.replace('/static/arm-asl', '/aslshow'));
            var filedescs = $('#regs-field-descs');
            filedescs.empty();
            var fieldbody = $('#regfield_body');
            fieldbody.empty();
            result = get_reg_filed(
                $('register_page > registers > register:first',response),
                regfile.replace('/static/arm-asl', '/aslshow'), regval);
            fieldbody.append(result['fieldbody']);
            filedescs.append(result['fieldesc']);
        }});
}

$(document).ready(function () {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const reg = urlParams.get('reg');
    const value = urlParams.get('value');

    if ($("#regname").val()=="") {
        $("#regname").val(reg == null ? 'ESR_EL3' : reg);
    }
    if ($("#regvalue").val()=="") {
        $("#regvalue").val(value == null ? '0x96000010' : value);
    }

    init_reg_list(goto_regs_desc);
})
