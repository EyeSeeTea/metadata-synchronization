import _ from "lodash";

export const mergeCustomizer = (obj: any, src: any): any =>
    _.isArray(obj) ? obj.concat(src) : src;
