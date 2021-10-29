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

function isEmpty(strValue)
{
    // Test whether strValue is empty
    if (!strValue || strValue.trim() === "" || (strValue.trim()).length === 0) {
        //do something
    }
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
function parse_fieldsets(reg, regval, anchor = "") {
    var current_lsb = 63;
    field_value_links = new Object();
    $( "> fields > field", reg).each(function () {
        field_name = $('> field_name', $(this));

        /**
         * @TODO: take 'fields_condition' into consideration
         */
        var msb = parseInt($('> field_msb', $(this)).text())
        var lsb = parseInt($('> field_lsb', $(this)).text())
        if (current_lsb < msb) {
            /* this field have another description taked */
            return;
        }
        current_lsb = lsb;
        var width = msb - lsb + 1;

        var value = regval >> lsb;
        value &= (1 << width) - 1;
        value = '0b' + get_val_string(value, width, 2);

        /**
         * This field value define the struct to another field.
         * i.e. ESR_ELx.EC
         * <field_value_links_to linked_field_condition="an exception from a Data Abort" linked_field_name="ISS"/>
         */
        if ($(this).attr('is_linked_to_partial_fieldset') === 'True') {
            $("> field_values > field_value_instance", $(this)).each(function () {
                const field_value_links_to = $('> field_value_links_to', $(this))[0];
                if ($('> field_value', $(this)).text() === value) {
                    console.log(
                        value,
                        $(field_value_links_to).attr('linked_field_name'),
                        $(field_value_links_to).attr('linked_field_condition'));
                    field_value_links[$(field_value_links_to).attr('linked_field_name')] = $(field_value_links_to).attr('linked_field_condition');
                }
            });
        }

        /**
         * This field contains sub field.
         * i.e. ESR_ELx.ISS
         *
         <partial_fieldset>
         <fields length="25">
         <fields_condition/>
         <fields_instance>an exception from a Data Abort</fields_instance>
         */
        if ($(this).attr('has_partial_fieldset') === 'True') {
            $("> partial_fieldset", $(this)).each(function () {
                fields_instance = $('> fields > fields_instance', $(this)).text();
                if (fields_instance === field_value_links[field_name.text()]) {
                    console.log("Dump partial fileset");
                    parse_fieldsets($(this), regval, fields_instance.replaceAll(" ", ""));
                }
            });
        } else {
            var id = $(this).attr('id');
            // console.log('get field: ', field_name.text(), ' value: ' + value);
            console.log("get value", field_name.text(), id, value, msb, lsb, width);
            regfields.push({
                'id': id,
                'name': id,
                'value': value,
                'msb': msb,
                'lsb': lsb,
                'width': width,
                'field': $(this),
                'is_partial' : false,
                'anchor' : anchor + id,
            });
        }
    });
}

function get_reg_filed(reg, regfile, regval) {
    regfields = new Array();
    fieldesc = '';
    parse_fieldsets($('reg_fieldsets', reg), regval);

    console.log('regfields: ', regfields);

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

        fieldbody += '<td class = "lr" colspan="'+ reg['width'] + '">' + '<a class="binval" target="_blank" href="' + regfile + '#' + reg['anchor'] + '">' + reg['name'] + '</a>' + '</td>';

        if (reg['lsb'] % 32 == 0) {
            fieldbody += '</tr>';
        }

        // use fields_instance as anchor. <fields_instance>an exception from a Data Abort</fields_instance>
        // dtd: <!ATTLIST field_value_links_to linked_field_condition CDATA #REQUIRED> <!-- The condition/description that distinguishes the layout of the other field. (Examples for ESR_ELx.EC are 'Exceptions with an unknown reason'.) -->
        // <field_value_links_to linked_field_condition="exceptions with an unknown reason" linked_field_name="ISS"/>
        //
        fieldesc += '<tr><th>'+ reg['msb'] +':' + reg['lsb'] + '</th><th>' + reg['name'] + '</th> <td><a class="binval" target="_blank" href="' + regfile + '#' + reg['anchor'] + '">' + binvalue + '</a><div class="hexvalue">' + hexvalue + '</div><div class="decvalue">' + decvalue + '</div></td></tr>';
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
