function defaro_getItemList(nodeItem, selectedItemElementName, options = {}) {

    options = $.extend({
        filterType:'',
        disableReadonly:false,
        refresh:false,
        allowEmpty:false
    }, options);

    function defaro_updateItemList(controller, selectedItemElement, itemName, refresh = false) {
        // Remove all previous and/or static (if any) elements from 'select' input element
        selectedItemElement.children().remove();


        if (controller) {
            selectedItemElement.multipleSelect('disable');

            $.getJSON('defaro/getDevices', {
                controllerID: controller.id,
                forceRefresh: refresh
            })
                .done(function (data, textStatus, jqXHR) {
                    try {

                        if (options.allowEmpty) {
                            selectedItemElement.html('<option value="">--Select device</option>');
                        }

                        var optgroup = '';
                        var disabled = '';
                        var nameSuffix = '';
                        // var selected = false;
                        var groupHtml = '';
                        var names = {};

                        var devices = data;

                        //devices
                        groupHtml = $('<optgroup/>', {label: RED._("node-red-contrib-defaro/in:multiselect.devices")});
                        groupHtml.appendTo(selectedItemElement);
                        $.each(devices, function(index, value) {
                            names[value.id] = value.name;
                            var role = '';
                            if ("role" in value && typeof(value.role) != undefined) {
                                role = ' (' + value.role + ')';
                            }
                            $('<option value="' + value.id + '" data-friendly_name="'+ value.name+'">' + value.name + role + '</option>').appendTo(groupHtml);
                        });

                        // Enable item selection
                        selectedItemElement.multipleSelect('enable');
                        // Finally, set the value of the input select to the selected value
                        selectedItemElement.val(itemName);
                        // Rebuild bootstrap multiselect form
                        selectedItemElement.multipleSelect('refresh');

                        // // Trim selected item string length with elipsis
                        var selectItemSpanElement = $(`span.multiselect-selected-text:contains("${itemName}")`);
                        var sHTML = selectItemSpanElement.html();
                        selectItemSpanElement.html(defaro_truncateWithEllipses(sHTML, 35));

                        $('#node-input-friendly_name').val(names[itemName]);
                    } catch (error) {
                        console.error('Error #4534');
                        console.log(error);
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    // Disable item selection if no items were retrieved
                    selectedItemElement.multipleSelect('disable');
                    selectedItemElement.multipleSelect('refresh');
                    //console.error(`Error: ${errorThrown}`);
                });

        } else {
            // Disable item selection if no (valid) controller was selected
            selectedItemElement.multipleSelect('disable');
            selectedItemElement.multipleSelect('refresh');
        }
    }


    var ServerElement = $('#node-input-server');
    var refreshListElement = $('#force-refresh');
    var selectedItemElement = $(selectedItemElementName);


    // Initialize  multiselect
    selectedItemElement.multipleSelect({
        maxHeight: 300,
        dropWidth: 320,
        width: 320,
        filter: true
    });

    var values = [];
    var isMultiple = selectedItemElement.attr('multiple')!==undefined;
    if (isMultiple) {
        values = selectedItemElement.val().length ? selectedItemElement.val() : nodeItem;
    } else {
        values = selectedItemElement.val() || nodeItem;
    }

    // Initial call to populate item list
    defaro_updateItemList(RED.nodes.node(ServerElement.val()), selectedItemElement, values, false);

    // onChange event handler in case a new controller gets selected
    ServerElement.change(function (event) {
        defaro_updateItemList(RED.nodes.node(ServerElement.val()), selectedItemElement, values, true);
    });
    refreshListElement.click(function (event) {
        // Force a refresh of the item list
        defaro_updateItemList(RED.nodes.node(ServerElement.val()), selectedItemElement, values, true);
    });
}

function defaro_truncateWithEllipses(text, max = 30) {
    if (text) {
        return text.substr(0, max - 1) + (text.length > max ? '&hellip;' : '');
    } else {
        return text;
    }
}



function defaro_getItemStateList(nodeItem, selectedItemElementName, options = {}) {

    options = $.extend({
        filterType:'',
        disableReadonly:false,
        refresh:false
    }, options);

    function defaro_updateItemStateList(controller, selectedItemElement, itemName) {
        // Remove all previous and/or static (if any) elements from 'select' input element
        selectedItemElement.children().remove();

        var uniqueId = $('#node-input-device_id').val();
        if (controller && uniqueId) {
            $.getJSON('defaro/getLastStateById', {
                controllerID: controller.id,
                device_id:uniqueId
            })
                .done(function (data, textStatus, jqXHR) {
                    try {
                        selectedItemElement.html('<option value="0">'+ RED._("node-red-contrib-defaro/in:multiselect.complete_payload")+'</option>');

                        var groupHtml = '';

                        if (data[0] && Object.keys(data[0]).length) {
                            groupHtml = $('<optgroup/>', {label: RED._("node-red-contrib-defaro/in:multiselect.defaro")});
                            groupHtml.appendTo(selectedItemElement);

                            $.each(data[0], function (index, value) {
                                var text = index;
                                if (typeof (value) != 'object') text += ' (' + value + ')';
                                $('<option  value="' + index + '">' + text + '</option>').appendTo(groupHtml);
                            });
                        }


                        //homekit formats
                        if (data[1] && Object.keys(data[1]).length) {
                            // if (options.groups && groupsByName) {
                            groupHtml = $('<optgroup/>', {label: RED._("node-red-contrib-defaro/in:multiselect.homekit")});
                            groupHtml.appendTo(selectedItemElement);

                            $.each(data[1], function (index, value) {
                                $('<option  value="homekit_' + index + '">' + index + '</option>').appendTo(groupHtml);
                            });
                        }


                        // Enable item selection
                        selectedItemElement.multipleSelect('enable');

                        // console.log('=======>');console.log(itemName);
                        // Finally, set the value of the input select to the selected value
                        if (selectedItemElement.find('option[value='+itemName+']').length) {
                            selectedItemElement.val(itemName);
                        } else {
                            selectedItemElement.val(selectedItemElement.find('option').eq(0).attr('value'));
                        }

                        selectedItemElement.multipleSelect('destroy');

                        // Trim selected item string length with elipsis
                        var selectItemSpanElement = $(`span.multiselect-selected-text:contains("${itemName}")`);
                        var sHTML = selectItemSpanElement.html();
                        selectItemSpanElement.html(defaro_truncateWithEllipses(sHTML, 35));

                    } catch (error) {
                        console.error('Error #4534');
                        console.log(error);
                    }

                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    // Disable item selection if no items were retrieved
                    selectedItemElement.multipleSelect('disable');
                    selectedItemElement.multipleSelect('refresh');
                    //console.error(`Error: ${errorThrown}`);
                });

        } else {
            // Disable item selection if no (valid) controller was selected
            selectedItemElement.multipleSelect('disable');
            selectedItemElement.multipleSelect('refresh');
        }
    }


    var deServerElement = $('#node-input-server');
    var selectedItemElement = $(selectedItemElementName);




    // Initialize bootstrap multiselect form
    selectedItemElement.multipleSelect('destroy');
    selectedItemElement.multipleSelect({
        numberDisplayed: 1,
        dropWidth: 320,
        width: 320,
        single: !(typeof $(this).attr('multiple') !== typeof undefined && $(this).attr('multiple') !== false)
    });


    // Initial call to populate item list
    defaro_updateItemStateList(RED.nodes.node(deServerElement.val()), selectedItemElement, selectedItemElement.val() || nodeItem);

    // onChange event handler in case a new controller gets selected
    deServerElement.change(function (event) {
        defaro_updateItemStateList(RED.nodes.node(deServerElement.val()), selectedItemElement, selectedItemElement.val() || nodeItem);
    });
}
