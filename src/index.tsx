import { useEffect, useState } from "react";
import { ActionPanel, Icon, List, Action, LocalStorage } from "@raycast/api";
import { faker, type UsableLocale } from "@faker-js/faker";
import { reduce, get, isFunction, isObject, groupBy, startCase } from "lodash";

type Item = {
  section: string;
  id: string;
  value: string;
  getValue(): string;
};

const blacklistPaths = [
  "locales",
  "locale",
  "localeFallback",
  "definitions",
  "fake",
  "faker",
  "unique",
  "helpers",
  "mersenne",
  "random",
];

const buildItems = (path: string) => {
  return reduce(
    path ? get(faker, path) : faker,
    (acc: Item[], func, key) => {
      if (blacklistPaths.includes(key)) {
        return acc;
      }

      if (isFunction(func)) {
        const getValue = (): string => {
          const value = func();
          return value ? value.toString() : "";
        };
        acc.push({ section: path, id: key, value: getValue(), getValue });
      } else if (isObject(func)) {
        acc.push(...buildItems(path ? `${path}.${key}` : key));
      }

      return acc;
    },
    []
  );
};

export default function Command() {
  return <Items />;
}

function Items() {
  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});
  useEffect(() => {
    const init = async () => {
      const locale = (await LocalStorage.getItem("locale")) || "en";
      console.log(locale);
      faker.setLocale(locale as UsableLocale);
      setGroupedItems(groupBy(buildItems(""), "section"));
    };
    init();
  }, []);

  return (
    <List isShowingDetail isLoading={!groupedItems}>
      {Object.entries(groupedItems).map(([section, items]) => (
        <List.Section key={section} title={startCase(section)}>
          {items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function Item({ item }: { item: Item }) {
  const [value, setValue] = useState(item.value);
  const updateValue = async () => {
    setValue(item.getValue());
  };

  return (
    <List.Item
      title={startCase(item.id)}
      icon={Icon.Dot}
      keywords={[item.section]}
      detail={<List.Item.Detail markdown={value} />}
      actions={
        <ActionPanel>
          <Action.Paste content={value} onPaste={updateValue} />
          <Action.CopyToClipboard content={value} onCopy={updateValue} />
          <Action
            title="Refresh Value"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={updateValue}
          />
          <Action.Push
            icon={Icon.Map}
            shortcut={{ modifiers: ["ctrl"], key: "f" }}
            title="Choose default language"
            target={<Locales />}
          />
        </ActionPanel>
      }
    />
  );
}

function Locales() {
  return (
    <List searchBarPlaceholder="Choose default language">
      <List.Section title="Languages">
        {Object.entries(faker.locales).map(([key, locale]) => {
          if (!locale) return null;

          return (
            <List.Item
              key={key}
              icon={Icon.Dot}
              title={locale.title}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Choose language"
                      target={<Items />}
                      onPush={() => {
                        faker.locale = key;
                        LocalStorage.setItem("locale", key);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
