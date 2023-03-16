class autofillForm extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.token;
    this.url =
      'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party';
  }

  closeOptionsOnBlur = (e) => {
    if (
      this.jsonDatalist.style.display === 'block' &&
      e.target.nodeName !== 'OPTION'
    ) {
      this.jsonDatalist.style.display = 'none';
    }
  };

  debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  getResponseByInputValue = (e, token, url) => {
    const query = e.target.party.value;
    const options = {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Token ' + token,
      },
      body: JSON.stringify({ query: query }),
    };

    return fetch(url, options)
      .then((response) => {
        if (!response.ok) {
          if (!response.status === 401) {
            throw new Error('Ошибка запроса данных с сервера.');
          }
          throw new Error(
            'Неправильный токен. Получите токен на https://dadata.ru/ для использования сервиса.'
          );
        }
        return response.text();
      })
      .then((result) => {
        const data = JSON.parse(result).suggestions;
        return data;
      });
  };

  fillInformationByOptionClick = (suggestionsData, option) => {
    const companyData = suggestionsData.find(
      (company) => company.value === option.value
    ).data;
    this.party.value = option.value;
    this.isDatalistVisible(false);
    this.nameShortField.value = companyData.name.short_with_opf || '';
    this.nameFullField.textContent = companyData.name.full_with_opf || '';
    this.innKppField.value = `${companyData.inn || ''} /  ${
      companyData.kpp || ''
    }`;
    let address = '';
    if (companyData.address) {
      if (companyData.address.data.qc == '0') {
        address = `${companyData.address.data.postal_code}, ${companyData.address.value}`;
      } else {
        address = companyData.address.data.source;
      }
    }
    this.addressField.textContent = address;
  };

  showOptions = (e) => {
    this.jsonDatalist.replaceChildren();
    this.getResponseByInputValue(e, this.token, this.url)
      .then((suggestionsData) => {
        if (suggestionsData) {
          suggestionsData.forEach((company) => {
            const option = document.createElement('option');
            option.value = company.value;
            option.textContent = company.value;
            this.jsonDatalist.appendChild(option);
          });

          if (!this.jsonDatalist.options.length) {
            this.isDatalistVisible(false);
          }
          if (this.jsonDatalist.options.length) {
            this.isDatalistVisible(true);
            for (let option of this.jsonDatalist.options) {
              option.onclick = () =>
                this.fillInformationByOptionClick(suggestionsData, option);
            }
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  debouncedShowOptions = this.debounce(this.showOptions, 800);

  isDatalistVisible = (boolean) =>
    (this.jsonDatalist.style.display = boolean ? 'block' : 'none');

  connectedCallback() {
    this.render();
    this.party = this.shadow.getElementById('party');
    this.jsonDatalist = this.shadow.getElementById('json-datalist');
    this.nameShortField = this.shadow.getElementById('name_short');
    this.nameFullField = this.shadow.getElementById('name_full');
    this.innKppField = this.shadow.getElementById('inn_kpp');
    this.addressField = this.shadow.getElementById('address-field');

    this.party.addEventListener('input', this.debouncedShowOptions);
    window.addEventListener('click', this.closeOptionsOnBlur);
  }

  disconnectedCallback() {
    party.removeEventListener('input', this.debouncedShowOptions);

    window.removeEventListener('click', this.closeOptionsOnBlur);
  }

  attributeChangedCallback(prop, oldVal, newVal) {
    if (prop === 'token') {
      this.token = newVal;
    }
  }

  static get observedAttributes() {
    return ['token'];
  }

  render() {
    this.shadow.innerHTML = `
    <link rel="stylesheet" href="./autofillForm/style.css"
    <section>
      <p class="title"><strong>Компания или ИП</strong></p>
      <div class="container" id="container">
        <input autocomplete="false" role="combobox" list="" id="party" name="json-datalist" class="input" type="text"
          placeholder="Введите название или ИНН организации" />
        <datalist id="json-datalist" role="listbox" class="datalist">
        </datalist>
      </div>
    </section>
    <section>
      <div class="row">
        <label class="title">Краткое наименование</label>
        <input id="name_short" class="input">
      </div>
      <div class="row">
        <label class="title">Полное наименование</label>
        <div contenteditable="true" id="name_full" class="castomTextarea"></div>
      </div>
      <div class="row">
        <label class="title">ИНН / КПП</label>
        <input id="inn_kpp" class="textarea">
      </div>
      <div class="row">
        <label class="title">Адрес</label>
        <div contenteditable="true" id="address-field" class="castomTextarea"></div>
      </div>
    </section>
    `;
  }
}

export default autofillForm;
