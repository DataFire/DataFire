# Pagination

Many APIs will break up long lists of data into multiple pages to keep response
sizes low. You can use the `nextPage` option if you want to grab multiple pages
in a single step. DataFire will accumulate the results as an array in `data[step.name]`.

> Currently pagination is only supported for Array responses.
> [See issue](https://github.com/bobby-brennan/datafire-v2/issues/11)

