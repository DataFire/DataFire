### Tests
Tests allow you to save a particular set of inputs and accounts for a given action, so that
the action can be run manually with the DataFire command-line tool.

```yaml
tests:
  get_torvalds:
    action: github/users.username.get
    input:
      username: torvalds
  get_norvig:
    action: github/users.username.get
    input:
      username: norvig
```

Run a test with:
```
datafire test <test_id>
```

