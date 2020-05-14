#! /usr/bin/env node

import * as path from "path";
import {sortCsvByGroup} from "../lib/csvGroupedSort.mjs";

async function handelSort(
    {
        paths,
        options: {
            numHeadersToSkip,
            nameFields,
            floatSortFields,
            sortBy,
            ascending,
            separateGroupsWithBlankLine,
        },
    }) {
    await sortCsvByGroup({
        paths,
        numHeadersToSkip,
        getGroupField: row => nameFields.map(field => row[field]).join(" "),
        getSortField: row => floatSortFields.map(field => parseFloat(row[field])).find(Boolean),
        sortBy: sortValues => {
            const values = sortValues.filter(Boolean);
            return values.length === 0 ? 0 : sortBy(...values);
        },
        ascending,
        transformGroup: ({group, sortValue}) => {
            const fieldName = "Sort Value";
            const isHeader = sortValue === null;
            if (isHeader) {
                sortValue = fieldName;
            }
            for (const {row, rowObj} of group) {
                const i = Object.keys(rowObj).indexOf(floatSortFields[0]);
                const value = sortValue.toString();
                rowObj[fieldName] = value;
                row.splice(i + 1, 0, value);
            }
            return (separateGroupsWithBlankLine && !isHeader) ? [{row: []}, ...group] : group;
        },
    });
}

function average(...values) {
    return values.reduce((a, b) => a + b) / values.length;
}

function onError(message) {
    console.error(message);
    process.exit(1);
}

async function main() {
    const [_node, script, inputFile, outputFile, nameField, sortBy] = process.argv;
    const paths = [inputFile, outputFile];
    const nameFields = {
        reviewee: ["First Name", "Last Name"],
        reviewer: ["PA/PM"],
    };
    const sorts = {
        min: Math.min,
        minimum: Math.min,
        max: Math.max,
        maximum: Math.max,
        avg: average,
        average: average,
    };
    
    const getOption = (fieldObj, fields) => {
        const [name, field] = Object.entries(fieldObj)[0];
        return fields[field] ?? onError(`error: ${name} must be in [${Object.keys(fields).join(", ")}]`);
    };
    
    if (paths.includes(undefined)) {
        const scriptName = path.basename(script);
        onError(`usage: ${scriptName} <inputFile.csv> <outputFile.csv> <nameField> <sortBy>`);
    }
    const options = {
        numHeadersToSkip: 1,
        nameFields: getOption({nameField}, nameFields),
        floatSortFields: ["Total Average Score", "Overall Performance\n"],
        sortBy: getOption({sortBy}, sorts),
        ascending: false,
        separateGroupsWithBlankLine: true,
    };
    await handelSort({
        paths: {
            input: inputFile,
            output: outputFile,
        },
        options,
    });
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
